import { useEffect, useState } from 'react';
import { fetchRuntimeStatus, type RuntimeStatus } from '../adapters/runtime';

const INITIAL_STATUS: RuntimeStatus = {
  mode: 'demo',
  provider: 'local-demo',
  model: 'demo',
  configured: false,
  available: true,
  message: 'Checking runtime...',
};

export function useRuntimeStatus(): RuntimeStatus {
  const [status, setStatus] = useState<RuntimeStatus>(INITIAL_STATUS);

  useEffect(() => {
    let cancelled = false;
    fetchRuntimeStatus().then((next) => {
      if (!cancelled) setStatus(next);
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

  return status;
}
