//
// Copyright 2026 DXOS.org
//

import type { JsonSchema } from '@dxos/echo';

/**
 * The data that crosses the bridge between the host and the guest. Imported by both sides, so it
 * holds types and pure helpers only: the guest bundle cannot carry anything host-specific.
 */

/** One object as the host holds it: its ECHO JSON (`Obj.toJSON`) and the host's change marker. */
export type Row = {
  readonly id: string;
  readonly json: Record<string, unknown>;
  /** Changes whenever the host's object changes; compared by the guest to keep its copy current. */
  readonly version: string;
};

/** One object the guest added, changed or removed, as the host applies it. */
export type WriteRecord = {
  readonly id: string;
  readonly json: Record<string, unknown>;
  readonly deleted: boolean;
};

/** A registered type the guest rebuilds, as schema rather than as the class that cannot cross. */
export type TypeRecord = {
  readonly typename: string;
  readonly version: string;
  readonly jsonSchema: JsonSchema.JsonSchema;
};

/** An operation the conversation binds, as the guest is told about it. */
export type OperationRecord = {
  readonly key: string;
  readonly name: string;
  readonly description?: string;
  /** Whether an operation backs it; an MCP tool has none and is called through `Tools` by name. */
  readonly backed: boolean;
};

/** What the guest is handed per evaluation. */
export type EvaluationInit = {
  readonly operations: readonly OperationRecord[];
  /** The `DOCS` object the dialect puts in scope. */
  readonly docs: Readonly<Record<string, string>>;
};

/** What an evaluation reports back. */
export type EvaluationResult =
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false; readonly message: string };

/** The outcome of a host-side call the guest's code may want to handle as a failure. */
export type Outcome = { readonly ok: true; readonly value: unknown } | { readonly ok: false; readonly message: string };

// Namespaced so that no plain value the model passes is read as one of these.
export const STORED_KEY = '@dxos/code-mode-djs/stored';
export const DETACHED_KEY = '@dxos/code-mode-djs/detached';
export const REFERENCE_KEY = '/';

/** A stored object: its id, and on the way to the guest its row, so the guest hydrates without a call. */
export type StoredValue = { readonly id: string; readonly uri: string; readonly row?: Row };

/** An object that is not in any database: its type and fields. */
export type DetachedValue = { readonly typename: string; readonly properties: Record<string, unknown> };

/** Host function names, as the guest calls them (`dx.query(...)`). */
export const HOST_NAMESPACE = 'dx';

export const HostFunction = {
  query: `${HOST_NAMESPACE}.query`,
  load: `${HOST_NAMESPACE}.load`,
  write: `${HOST_NAMESPACE}.write`,
  refresh: `${HOST_NAMESPACE}.refresh`,
  invoke: `${HOST_NAMESPACE}.invoke`,
  tool: `${HOST_NAMESPACE}.tool`,
  print: `${HOST_NAMESPACE}.print`,
  sleep: `${HOST_NAMESPACE}.sleep`,
} as const;

/** The global the guest bundle installs its runtime under. */
export const GUEST_GLOBAL = '__dxGuest';

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype;

/** The entry under `key` when it is the record's only one. */
export const sole = (value: Record<string, unknown>, key: string): unknown => {
  const keys = Object.keys(value);
  return keys.length === 1 && keys[0] === key ? value[key] : undefined;
};

/** A short, stable hash of a row's JSON text: the version the host compares on refresh. */
export const versionOf = (json: unknown): string => {
  const text = JSON.stringify(json) ?? '';
  // FNV-1a, 32 bit: collisions only cost a missed refresh of one object, never a wrong write.
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `${text.length.toString(36)}-${(hash >>> 0).toString(36)}`;
};
