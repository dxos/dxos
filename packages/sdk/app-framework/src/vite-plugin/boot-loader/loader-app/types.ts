//
// Copyright 2026 DXOS.org
//

/**
 * Status payload accepted by `window.__bootLoader.status(...)`. The caller owns
 * formatting — `humanized` is the exact text rendered — while `event` / `module`
 * carry the structured activation ids for the boot trace, and `range` drives an
 * in-place `(index/total)` counter for long counted phases.
 */
export type StatusPayload = {
  /**
   * Raw activation event key (e.g. `dxos.org/plugin/observability/activate`)
   * when the transition is event-level.
   */
  event?: string;

  /**
   * Raw module id (e.g. `org.dxos.plugin.observability.module.ReactSurface`)
   * when the transition is module-level.
   */
  module?: string;

  /** Exact text to display (e.g. "Activating Observability: react-surface"). */
  humanized: string;

  /**
   * Optional `(index/total)` tick. When present the loader replaces the current
   * line in place ("Loading plugins (12/80)") instead of appending a new entry —
   * keeps the visible log compact during long counted phases.
   */
  range?: { index: number; total: number };
};

/**
 * Imperative facade exposed on `window.__bootLoader`, installed by the inlined
 * loader bundle and driven by the host app (the React relay forwards `useApp`'s
 * startup progress through it).
 */
export type BootLoaderApi = {
  /** Update the visible status line. */
  status: (payload: StatusPayload) => void;
  /** Enter host-driven progress — `fraction` ∈ [0, 1]. */
  progress: (fraction?: number) => void;
  /** Play the dismissal outro, then remove the loader DOM (graceful path). */
  ready: () => void;
  /** Remove the loader DOM immediately (fast-load backstop / terminal). */
  dismiss: () => void;
};

/**
 * Config baked into `index.html` by `bootLoaderPlugin` ahead of the loader
 * bundle, so the compiled app stays static (compiled once, independent of the
 * host's brand mark / initial status).
 */
export type BootLoaderConfig = {
  /**
   * Id of the static backdrop element the plugin injects and the loader mounts
   * into — the single coupling between `transformIndexHtml` and the app. The
   * plugin owns the authoritative value and passes it here so `entry.tsx` reads
   * it rather than hardcoding (the CSS selector mirrors it — see `boot-loader.css`).
   */
  rootId?: string;
  /** Inline SVG markup for the brand mark rendered inside the ring. */
  markSvg?: string;
  /** Initial status text rendered before the host fires its first `status(...)`. */
  status?: string;
};

/** Fallback backdrop id when no config is present (kept in sync with `loader.ts` + the CSS). */
export const DEFAULT_ROOT_ID = 'boot-loader';

declare global {
  interface Window {
    __bootLoader?: BootLoaderApi;
    __BOOT_LOADER_CONFIG__?: BootLoaderConfig;
  }
}
