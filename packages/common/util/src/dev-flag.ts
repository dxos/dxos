//
// Copyright 2026 DXOS.org
//

/** Namespace for developer toggles in `localStorage`, so they are obvious when inspecting a profile. */
const DEV_FLAG_PREFIX = 'dx.dev.';

/**
 * Known developer toggles. The names live here rather than in the feature packages because the control
 * that sets a flag and the code that reads it routinely sit in packages that must not depend on each
 * other — a layout plugin rendering the switch, a content plugin honouring it.
 */
export const DevFlag = {
  /** Gates outbound news-feed fetches in dev builds; honoured by the magazine plugin's feed sync. */
  RemoteFeedPull: 'magazine.remote-pull',
} as const;

/**
 * Reads a developer-only toggle, persisted per browser profile.
 *
 * Call sites must gate on `import.meta.env.DEV` themselves rather than relying on this returning
 * `false` in production: that keeps the production behaviour visible at the call site and lets the
 * bundler drop the branch entirely. Returns the default wherever `localStorage` is absent — a worker
 * or a Node process — so a flag can never make non-browser code diverge from its documented default.
 */
export const getDevFlag = (name: string, defaultValue = false): boolean => {
  try {
    const stored = globalThis.localStorage?.getItem(DEV_FLAG_PREFIX + name);
    return stored === null || stored === undefined ? defaultValue : stored === 'true';
  } catch {
    // Access throws outright when storage is disabled or partitioned.
    return defaultValue;
  }
};

export const setDevFlag = (name: string, value: boolean): void => {
  try {
    globalThis.localStorage?.setItem(DEV_FLAG_PREFIX + name, String(value));
  } catch {
    // Ignored: a toggle that cannot persist is not worth failing a render over.
  }
};
