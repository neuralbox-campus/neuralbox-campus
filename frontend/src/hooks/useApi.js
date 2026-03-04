import { useState, useEffect, useCallback } from 'react';
import { get, post, put, del, patch } from '../utils/api';

// Generic fetch hook with loading/error
export function useApi(path, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await get(path);
      setData(res.data || res);
      return res.data || res;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => { refetch(); }, [path, ...deps]);

  return { data, loading, error, refetch, setData };
}

// Mutation hook (POST/PUT/DELETE)
export function useMutation(method = 'POST') {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const mutate = useCallback(async (path, body) => {
    setLoading(true);
    setError(null);
    try {
      const fn = method === 'POST' ? post : method === 'PUT' ? put : method === 'PATCH' ? patch : del;
      const res = await fn(path, body);
      return res;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [method]);

  return { mutate, loading, error };
}
