import { useEffect, useState, useCallback } from 'react'

export interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
  reload: () => void
}

/**
 * Shared data-fetching helper giving consistent loading / error / reload
 * states so every API-driven page behaves the same (no blank pages, no raw
 * stack traces surfaced to the user).
 */
export function useAsync<T>(loader: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    loader()
      .then((result) => { if (!cancelled) { setData(result); setLoading(false) } })
      .catch((requestError: Error) => { if (!cancelled) { setError(requestError.message || 'Terjadi kesalahan'); setLoading(false) } })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])

  const reload = useCallback(() => setTick((value) => value + 1), [])
  return { data, loading, error, reload }
}
