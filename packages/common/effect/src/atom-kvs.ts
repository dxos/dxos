//
// Copyright 2025 DXOS.org
//

import * as BrowserKeyValueStore from '@effect/platform-browser/BrowserKeyValueStore';
import { Atom } from '@effect-atom/atom-react';
import type * as Schema from 'effect/Schema';

// TODO(wittjosiah): This is currently provided for convenience but maybe should be removed.
const defaultRuntime = Atom.runtime(BrowserKeyValueStore.layerLocalStorage);

/**
 * Creates a KVS-backed atom for structured settings using Atom.kvs.
 * The entire object is stored as a single localStorage key with JSON serialization.
 *
 * @param options.key - The localStorage key to store the value under.
 * @param options.schema - Effect Schema for the value type.
 * @param options.defaultValue - Function returning the default value.
 * @param options.runtime - Optional custom Atom runtime (defaults to localStorage).
 * @returns A writable atom that persists to localStorage.
 */
export const createKvsStore = <T extends Record<string, any>>(options: {
  key: string;
  schema: Schema.Schema<T>;
  defaultValue: () => T;
  runtime?: ReturnType<typeof Atom.runtime>;
}): Atom.Writable<T> => {
  const runtime = options.runtime ?? defaultRuntime;
  return Atom.kvs({
    runtime,
    key: options.key,
    schema: options.schema,
    defaultValue: options.defaultValue,
  }).pipe(Atom.keepAlive);
};
