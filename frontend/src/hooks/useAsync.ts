import { useState, useCallback } from 'react';

export function useAsync<T>(asyncFn: (...args: any[]) => Promise<T>) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [value, setValue] = useState<T | null>(null);

  const execute = useCallback(async (...args: any[]) => {
    setLoading(true);
    setError(null);
    try {
      const response = await asyncFn(...args);
      setValue(response);
      return response;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [asyncFn]);

  return { run: execute, loading, error, value };
}
