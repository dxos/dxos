//
// Copyright 2026 DXOS.org
//

import browser from 'webextension-polyfill';

/**
 * Typed extension state.
 *
 * A thin, schema-validated layer over `browser.storage` that replaces scattered raw `storage.get`/
 * `set` calls and loose string key constants. Each {@link StateEntry} owns one storage key: its area
 * (`sync` for user config synced across the user's browsers, `local` for per-install session data),
 * its default, and a decoder that rejects malformed persisted values (storage survives extension
 * upgrades, so it is treated as untrusted input).
 *
 * Kept dependency-light (no `effect`) so it is safe to use from the per-page content script.
 */
export type StorageArea = 'sync' | 'local';

export type StateEntry<T> = {
  /** Read the current value, falling back to the default when unset or malformed. */
  readonly get: () => Promise<T>;
  /** Persist a value. */
  readonly set: (value: T) => Promise<void>;
  /** Remove the key. */
  readonly remove: () => Promise<void>;
  /** Observe changes to this key; returns an unsubscribe function. */
  readonly subscribe: (onChange: (value: T) => void) => () => void;
};

/** Define a typed, validated accessor over a single `browser.storage` key. */
export const defineState = <T>(
  area: StorageArea,
  key: string,
  fallback: T,
  decode: (raw: unknown) => T | undefined,
): StateEntry<T> => ({
  get: async () => {
    const stored = await browser.storage[area].get(key);
    return decode(stored?.[key]) ?? fallback;
  },
  set: async (value) => {
    await browser.storage[area].set({ [key]: value });
  },
  remove: async () => {
    await browser.storage[area].remove(key);
  },
  subscribe: (onChange) => {
    const listener = (changes: Record<string, browser.Storage.StorageChange>, changedArea: string) => {
      if (changedArea === area && key in changes) {
        onChange(decode(changes[key]?.newValue) ?? fallback);
      }
    };
    browser.storage.onChanged.addListener(listener);
    return () => browser.storage.onChanged.removeListener(listener);
  },
});

export const decodeBoolean = (raw: unknown): boolean | undefined => (typeof raw === 'boolean' ? raw : undefined);

export const decodeString = (raw: unknown): string | undefined => (typeof raw === 'string' ? raw : undefined);

export const decodeStringArray = (raw: unknown): string[] | undefined =>
  Array.isArray(raw) && raw.every((entry) => typeof entry === 'string') ? [...raw] : undefined;
