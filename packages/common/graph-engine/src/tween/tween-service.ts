//
// Copyright 2026 DXOS.org
//

import { easeCubicOut } from 'd3';

export type TweenValue = { x: number; y: number; r?: number };

export type EasingId = 'linear' | 'cubic-out';

export type TweenOptions = {
  duration?: number; // ms; default 300
  easing?: EasingId; // default 'cubic-out'
};

type Entry = {
  source: TweenValue;
  target: TweenValue;
  current: TweenValue;
  startedAt?: number;
  duration: number;
  easing: EasingId;
};

const easings: Record<EasingId, (t: number) => number> = {
  linear: (t) => t,
  'cubic-out': easeCubicOut,
};

/**
 * Single source of animated layout values. Projectors call setTarget; the service produces frames.
 */
export class TweenService {
  #entries = new Map<string, Entry>();
  #now = 0;

  /**
   * Publish a new target for an entity. If duration is 0, the entity snaps to target.
   */
  setTarget(id: string, target: TweenValue, opts?: TweenOptions): void {
    const rawDuration = opts?.duration ?? 300;
    // Clamp non-finite / negative durations to a safe default so a bad option can't
    // permanently stall an entry.
    const duration = Number.isFinite(rawDuration) && rawDuration >= 0 ? rawDuration : 300;
    const easing = opts?.easing ?? 'cubic-out';
    const existing = this.#entries.get(id);
    if (!existing) {
      this.#entries.set(id, {
        source: { ...target },
        target: { ...target },
        current: { ...target },
        startedAt: duration > 0 ? this.#now : undefined,
        duration,
        easing,
      });
      return;
    }
    existing.source = { ...existing.current };
    existing.target = { ...target };
    existing.duration = duration;
    existing.easing = easing;
    existing.startedAt = duration > 0 ? this.#now : undefined;
    if (duration === 0) {
      existing.current = { ...target };
    }
  }

  /**
   * Advance the clock to `t` (ms since arbitrary origin). Computes new currents.
   */
  advance(t: number): void {
    this.#now = t;
    for (const e of this.#entries.values()) {
      if (e.startedAt === undefined) {
        continue;
      }
      const elapsed = t - e.startedAt;
      if (elapsed >= e.duration) {
        e.current = { ...e.target };
        e.startedAt = undefined;
        continue;
      }
      const u = easings[e.easing](elapsed / e.duration);
      e.current = {
        x: e.source.x + (e.target.x - e.source.x) * u,
        y: e.source.y + (e.target.y - e.source.y) * u,
        r:
          e.source.r !== undefined && e.target.r !== undefined
            ? e.source.r + (e.target.r - e.source.r) * u
            : (e.target.r ?? e.source.r),
      };
    }
  }

  read(id: string): TweenValue | undefined {
    return this.#entries.get(id)?.current;
  }

  remove(id: string): void {
    this.#entries.delete(id);
  }

  isAnimating(): boolean {
    for (const e of this.#entries.values()) {
      if (e.startedAt !== undefined) {
        return true;
      }
    }
    return false;
  }
}
