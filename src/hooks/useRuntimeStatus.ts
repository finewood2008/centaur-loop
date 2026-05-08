import { useEffect, useState } from 'react';
import {
  connectRuntime,
  fetchRuntimeStatus,
  scanRuntimeConnectors,
  type RuntimeConnector,
  type RuntimeStatus,
} from '../adapters/runtime';

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
  connectingRuntimeId: string | null;
  selectRuntime: (runtimeId: string) => Promise<boolean>;
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

function chooseSelectedConnector(scanConnectors: RuntimeConnector[]): RuntimeConnector {
  const stored = readStoredRuntimeId();
  return scanConnectors.find((connector) => connector.id === stored && connector.available)
    ?? scanConnectors.find((connector) => connector.available)
    ?? scanConnectors[0];
}

export function useRuntimeStatus(): RuntimeState {
  const [status, setStatus] = useState<RuntimeStatus>(INITIAL_STATUS);
  const [connectors, setConnectors] = useState<RuntimeConnector[]>([]);
  const [selectedRuntimeId, setSelectedRuntimeId] = useState<string>('local-demo');
  const [connectingRuntimeId, setConnectingRuntimeId] = useState<string | null>(null);

  const applyScan = async () => {
    const scan = await scanRuntimeConnectors();
    const selected = chooseSelectedConnector(scan.connectors);

    setConnectors(scan.connectors);
    setSelectedRuntimeId(selected.id);
    window.localStorage.setItem(STORAGE_KEY, selected.id);
    setStatus(toStatus(selected));
  };

  useEffect(() => {
    let cancelled = false;
    scanRuntimeConnectors().then((scan) => {
      if (cancelled) return;
      const selected = chooseSelectedConnector(scan.connectors);
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

  const selectRuntime = async (runtimeId: string): Promise<boolean> => {
    const selected = connectors.find((connector) => connector.id === runtimeId);
    if (!selected || !selected.available) return false;

    setConnectingRuntimeId(runtimeId);
    try {
      const result = await connectRuntime(runtimeId);
      setConnectors((current) => current.map((connector) =>
        connector.id === runtimeId ? result.connector : connector,
      ));
      window.localStorage.setItem(STORAGE_KEY, runtimeId);
      setSelectedRuntimeId(runtimeId);
      setStatus(result.status);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Runtime connection failed.';
      setStatus((current) => ({
        ...current,
        available: false,
        message,
      }));
      return false;
    } finally {
      setConnectingRuntimeId(null);
    }
  };

  return {
    ...status,
    connectors,
    selectedRuntimeId,
    connectingRuntimeId,
    selectRuntime,
    rescan: applyScan,
  };
}
