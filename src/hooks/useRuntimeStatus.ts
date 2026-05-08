import { useEffect, useState } from 'react';
import { fetchRuntimeStatus, scanRuntimeConnectors, type RuntimeConnector, type RuntimeStatus } from '../adapters/runtime';

const INITIAL_STATUS: RuntimeStatus = {
  mode: 'demo',
  provider: 'local-demo',
  model: 'demo',
  configured: false,
  available: true,
  message: 'Checking runtime...',
};

const STORAGE_KEY = 'centaur_loop_runtime_id';

export interface RuntimeState extends RuntimeStatus {
  connectors: RuntimeConnector[];
  selectedRuntimeId: string;
  selectRuntime: (runtimeId: string) => void;
  rescan: () => Promise<void>;
}

function toStatus(connector: RuntimeConnector): RuntimeStatus {
  return {
    mode: connector.kind === 'demo' ? 'demo' : 'real',
    provider: connector.provider,
    model: connector.model,
    configured: connector.configured,
    available: connector.available,
    message: connector.message,
    selectedRuntimeId: connector.id,
  };
}

function readStoredRuntimeId(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

export function useRuntimeStatus(): RuntimeState {
  const [status, setStatus] = useState<RuntimeStatus>(INITIAL_STATUS);
  const [connectors, setConnectors] = useState<RuntimeConnector[]>([]);
  const [selectedRuntimeId, setSelectedRuntimeId] = useState<string>('local-demo');

  const applyScan = async () => {
    const scan = await scanRuntimeConnectors();
    const stored = readStoredRuntimeId();
    const selectedId = stored && scan.connectors.some((connector) => connector.id === stored)
      ? stored
      : scan.selectedRuntimeId;
    const selected = scan.connectors.find((connector) => connector.id === selectedId) ?? scan.connectors[0];

    setConnectors(scan.connectors);
    setSelectedRuntimeId(selected.id);
    window.localStorage.setItem(STORAGE_KEY, selected.id);
    setStatus(toStatus(selected));
  };

  useEffect(() => {
    let cancelled = false;
    scanRuntimeConnectors().then((scan) => {
      if (cancelled) return;
      const stored = readStoredRuntimeId();
      const selectedId = stored && scan.connectors.some((connector) => connector.id === stored)
        ? stored
        : scan.selectedRuntimeId;
      const selected = scan.connectors.find((connector) => connector.id === selectedId) ?? scan.connectors[0];
      setConnectors(scan.connectors);
      setSelectedRuntimeId(selected.id);
      window.localStorage.setItem(STORAGE_KEY, selected.id);
      setStatus(toStatus(selected));
    }).catch(() => {
      fetchRuntimeStatus().then((next) => {
        if (!cancelled) setStatus(next);
      });
    });

    const handleMode = (event: Event) => {
      const custom = event as CustomEvent<{ mode?: RuntimeStatus['mode'] }>;
      if (custom.detail?.mode === 'demo') {
        setStatus((current) => ({
          ...current,
          mode: 'demo',
          provider: 'local-demo',
          model: 'demo',
          available: true,
          message: 'Remote runtime failed. Demo runtime is active.',
        }));
      }
      if (custom.detail?.mode === 'real') {
        setStatus((current) => ({
          ...current,
          mode: 'real',
          available: true,
        }));
      }
    };

    window.addEventListener('centaur-runtime-mode', handleMode);
    return () => {
      cancelled = true;
      window.removeEventListener('centaur-runtime-mode', handleMode);
    };
  }, []);

  const selectRuntime = (runtimeId: string) => {
    const selected = connectors.find((connector) => connector.id === runtimeId);
    if (!selected) return;
    window.localStorage.setItem(STORAGE_KEY, runtimeId);
    setSelectedRuntimeId(runtimeId);
    setStatus(toStatus(selected));
  };

  return {
    ...status,
    connectors,
    selectedRuntimeId,
    selectRuntime,
    rescan: applyScan,
  };
}
