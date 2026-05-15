/**
 * Memory 适配层（增强版）
 *
 * 在 localStorage 基础上增加：
 * - 标签系统（tags）
 * - 语义相关性评分（TF-IDF 简化版）
 * - 过期机制（TTL）
 * - 访问频率追踪（用于排序）
 */

export type MemoryCategory = 'preference' | 'fact' | 'lesson' | 'correction';

export interface MemoryEntry {
  id: string;
  content: string;
  category: MemoryCategory;
  agentId: string;
  tags: string[];
  createdAt: string;
  expiresAt?: string;
  accessCount: number;
  lastAccessedAt?: string;
}

const STORAGE_KEY = 'centaur_loop_memories';

function loadMemories(): MemoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const entries = JSON.parse(raw) as MemoryEntry[];
    return entries.map((e) => ({
      ...e,
      tags: e.tags ?? [],
      accessCount: e.accessCount ?? 0,
    }));
  } catch {
    return [];
  }
}

function saveMemories(entries: MemoryEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function isExpired(entry: MemoryEntry): boolean {
  if (!entry.expiresAt) return false;
  return new Date(entry.expiresAt).getTime() < Date.now();
}

function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^\w一-鿿]/g, ' ').split(/\s+/).filter(Boolean);
}

function computeRelevance(entry: MemoryEntry, queryTokens: string[]): number {
  if (queryTokens.length === 0) return 0;
  const contentTokens = new Set(tokenize(entry.content));
  const tagTokens = new Set(entry.tags.map((t) => t.toLowerCase()));

  let score = 0;
  for (const qt of queryTokens) {
    if (contentTokens.has(qt)) score += 1;
    if (tagTokens.has(qt)) score += 2;
  }

  // Boost by recency (decay over 30 days)
  const ageMs = Date.now() - new Date(entry.createdAt).getTime();
  const recencyBoost = Math.max(0, 1 - ageMs / (30 * 24 * 60 * 60 * 1000));
  score += recencyBoost * 0.5;

  // Boost by access frequency
  score += Math.min(entry.accessCount * 0.1, 1);

  return score;
}

function markAccessed(entries: MemoryEntry[], ids: string[]): void {
  const idSet = new Set(ids);
  const now = new Date().toISOString();
  let changed = false;
  for (const entry of entries) {
    if (idSet.has(entry.id)) {
      entry.accessCount += 1;
      entry.lastAccessedAt = now;
      changed = true;
    }
  }
  if (changed) saveMemories(entries);
}

export async function searchAgentMemory(
  agentId: string,
  query: string,
  limit: number = 20,
): Promise<MemoryEntry[]> {
  const all = loadMemories().filter((m) => m.agentId === agentId && !isExpired(m));

  if (!query.trim()) {
    const results = all.slice(-limit);
    markAccessed(loadMemories(), results.map((r) => r.id));
    return results;
  }

  const queryTokens = tokenize(query);
  const scored = all
    .map((entry) => ({ entry, score: computeRelevance(entry, queryTokens) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.entry);

  if (scored.length > 0) {
    markAccessed(loadMemories(), scored.map((r) => r.id));
    return scored;
  }

  // Fallback: return most recent
  const fallback = all.slice(-limit);
  markAccessed(loadMemories(), fallback.map((r) => r.id));
  return fallback;
}

export async function listAgentMemories(agentId: string, limit: number = 20): Promise<MemoryEntry[]> {
  return loadMemories()
    .filter((m) => m.agentId === agentId && !isExpired(m))
    .slice(-limit)
    .reverse();
}

export async function storeAgentMemory(
  agentId: string,
  content: string,
  category: MemoryCategory,
  options?: { tags?: string[]; ttlDays?: number },
): Promise<{ ok: boolean }> {
  const trimmed = content.trim();
  if (!trimmed) return { ok: false };

  const entry: MemoryEntry = {
    id: `mem-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    content: trimmed,
    category,
    agentId,
    tags: options?.tags ?? extractAutoTags(trimmed),
    createdAt: new Date().toISOString(),
    expiresAt: options?.ttlDays
      ? new Date(Date.now() + options.ttlDays * 24 * 60 * 60 * 1000).toISOString()
      : undefined,
    accessCount: 0,
  };

  const all = loadMemories();
  all.push(entry);
  saveMemories(all);
  return { ok: true };
}

export async function deleteExpiredMemories(agentId: string): Promise<number> {
  const all = loadMemories();
  const before = all.length;
  const filtered = all.filter((m) => m.agentId !== agentId || !isExpired(m));
  saveMemories(filtered);
  return before - filtered.length;
}

export async function tagMemory(memoryId: string, tags: string[]): Promise<boolean> {
  const all = loadMemories();
  const entry = all.find((m) => m.id === memoryId);
  if (!entry) return false;
  entry.tags = [...new Set([...entry.tags, ...tags])];
  saveMemories(all);
  return true;
}

export async function searchByTag(agentId: string, tag: string): Promise<MemoryEntry[]> {
  const lower = tag.toLowerCase();
  return loadMemories().filter(
    (m) => m.agentId === agentId && !isExpired(m) && m.tags.some((t) => t.toLowerCase() === lower),
  );
}

function extractAutoTags(content: string): string[] {
  const tags: string[] = [];
  // Extract hashtag-style tags
  const hashTags = content.match(/#[\w一-鿿]+/g);
  if (hashTags) tags.push(...hashTags.map((t) => t.slice(1)));
  // Extract quoted terms as tags
  const quoted = content.match(/[「「]([^」」]+)[」」]/g);
  if (quoted) tags.push(...quoted.map((t) => t.slice(1, -1)));
  return [...new Set(tags)].slice(0, 5);
}
