import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Load data on mount (and whenever `deps` change) with loading / error state.
 * Responses that arrive after a newer request, or after unmount, are ignored.
 *
 *   const { data, error, loading, reload, setData } = useLoader(() => friendsApi.friends(), []);
 */
export function useLoader(load, deps) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const requestId = useRef(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(load, deps);

  const reload = useCallback(async () => {
    const id = ++requestId.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await run();
      if (id === requestId.current) setState({ data, error: null, loading: false });
      return data;
    } catch (error) {
      if (id === requestId.current) setState((s) => ({ ...s, error, loading: false }));
      return undefined;
    }
  }, [run]);

  useEffect(() => {
    reload();
    return () => {
      requestId.current += 1; // drop in-flight responses
    };
  }, [reload]);

  const setData = useCallback((updater) => {
    setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater }));
  }, []);

  return { ...state, reload, setData };
}
