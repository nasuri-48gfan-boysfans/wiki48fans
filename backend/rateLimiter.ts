/**
 * Paced rate limiter: spreads requests evenly so they never exceed a
 * per-minute target (leaky-bucket pacing). Each `acquire()` waits until its
 * evenly-spaced time slot; this guarantees a smooth ≤ target/min rate with no
 * bursts, which is exactly what we want against 48pedia's 60/min quota.
 *
 * When the source returns 429, `observeRateLimit(recoveryMs)` forces a cooldown
 * (honoring Retry-After when known) before the next acquire is granted.
 */

export interface RateLimiterOptions {
  /** Target requests per minute. We run below the server cap for margin. */
  maxPerMinute: number
  /** Default cooldown (ms) applied when a 429 has no Retry-After header. */
  defaultBackoffMs?: number
  /** Optional hook so callers (CLI) can print "waiting for rate limit". */
  onWait?: (seconds: number) => void
}

export class RateLimiter {
  private readonly intervalMs: number
  private readonly defaultBackoffMs: number
  private readonly onWait?: (seconds: number) => void

  private nextSlot = 0

  constructor(options: RateLimiterOptions) {
    this.intervalMs = Math.max(1, Math.round(60_000 / options.maxPerMinute))
    this.defaultBackoffMs = options.defaultBackoffMs ?? 30_000
    this.onWait = options.onWait
  }

  /** Wait until this request's evenly-spaced slot, then resolve. */
  acquire(): Promise<void> {
    const now = Date.now()
    const delay = Math.max(0, this.nextSlot - now)
    this.nextSlot = Math.max(now, this.nextSlot) + this.intervalMs
    if (delay > 0) this.onWait?.(Math.ceil(delay / 1000))
    return this.sleep(delay)
  }

  /** The source hit a 429: pause the next slot until recovery. */
  observeRateLimit(recoveryMs?: number): void {
    this.nextSlot = Math.max(this.nextSlot, Date.now()) + (recoveryMs ?? this.defaultBackoffMs)
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)))
  }
}
