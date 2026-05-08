/**
 * Memory 适配层
 *
 * 替代 centaurai-edge 的 memory/repository.ts。
 * 独立产品中使用 localStorage 作为记忆存储。
 */

export type MemoryCategory = 'preference' | 'fact' | 'lesson' | 'correction';

export interface MemoryEntry {
  id: string;
  content: string;
  category: MemoryCategory;
  agentId: string;
  createdAt: string;
}

const STORAGE_KEY = 'centaur_loop_memories';

function loadMemories(): MemoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as MemoryEntry[]) : [];
  } catch {
    return [];
  }
}

function saveMemories(entries: MemoryEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export async function searchAgentMemory(
  agentId: string,
  query: string,
  limit: number = 20,
): Promise<MemoryEntry[]> {
  const all = loadMemories().filter((m) => m.agentId === agentId);
  if (!query.trim()) return all.slice(-limit);

  const lower = query.toLowerCase();
  return all
    .filter((m) => m.content.toLowerCase().includes(lower))
    .slice(-limit);
}

export async function storeAgentMemory(
  agentId: string,
  content: string,
  category: MemoryCategory,
): Promise<{ ok: boolean }> {
  const trimmed = content.trim();
  if (!trimmed) return { ok: false };

  const entry: MemoryEntry = {
    id: `mem-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    content: trimmed,
    category,
    agentId,
    createdAt: new Date().toISOString(),
  };

  const all = loadMemories();
  all.push(entry);
  saveMemories(all);
  return { ok: true };
}
