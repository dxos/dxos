//
// Copyright 2025 DXOS.org
//

import * as Atom from 'effect/unstable/reactivity/Atom';

import * as Node from './AppGraphNode';

/**
 * `Atom.withLabel` captures and formats a stack trace on every call, and the graph labels an atom per node,
 * per connection key, and per extension, so one expansion costs hundreds of captures on the main thread —
 * hence opt-in, and only under the dev server.
 */
const ATOM_LABELS = Boolean(import.meta.env?.DEV) && import.meta.env?.VITE_ATOM_LABELS === 'true';

/** {@link Atom.withLabel}, reduced to a pass-through wherever labels are not collected. */
export const withLabel: (name: string) => <A extends Atom.Atom<any>>(self: A) => A = ATOM_LABELS
  ? Atom.withLabel
  : () => (self) => self;

// PRIMARY separates top-level components (e.g., node ID from relation) in compound string keys used within the app-graph package.
const PRIMARY = '\u0001';

// SECONDARY separates sub-components within an encoded value (e.g., relation kind from direction) in the same context.
const SECONDARY = '\u0002';

/** Join parts with the primary separator. */
export const primaryKey = (...parts: string[]): string => parts.join(PRIMARY);

/** Split a key on the primary separator. */
export const primaryParts = (key: string): string[] => key.split(PRIMARY);

/** Join parts with the secondary separator. */
export const secondaryKey = (...parts: string[]): string => parts.join(SECONDARY);

/** Split a key on the secondary separator. */
export const secondaryParts = (key: string): string[] => key.split(SECONDARY);

/**
 * Normalize a relation input to a full Relation object.
 */
export const normalizeRelation = (relation?: Node.RelationInput): Node.Relation =>
  relation == null ? Node.childRelation() : typeof relation === 'string' ? Node.relation(relation) : relation;

/**
 * Shallow-compare two values: same reference, or same own-keys with === values.
 */
export const shallowEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) {
    return true;
  }
  if (a == null || b == null || typeof a !== 'object' || typeof b !== 'object') {
    return false;
  }
  const keysA = Object.keys(a as Record<string, unknown>);
  const keysB = Object.keys(b as Record<string, unknown>);
  if (keysA.length !== keysB.length) {
    return false;
  }
  return keysA.every((k) => (a as Record<string, unknown>)[k] === (b as Record<string, unknown>)[k]);
};

/**
 * Returns true if two NodeArg arrays are semantically identical (same id, type, data, properties per index).
 * Inline child nodes (the `nodes` field) are compared recursively.
 */
export const nodeArgsUnchanged = (prev: readonly Node.NodeArg<any>[], next: readonly Node.NodeArg<any>[]): boolean => {
  if (prev.length !== next.length) {
    return false;
  }

  return prev.every((prevNode, idx) => {
    const nextNode = next[idx];
    return (
      prevNode.id === nextNode.id &&
      prevNode.type === nextNode.type &&
      shallowEqual(prevNode.data, nextNode.data) &&
      shallowEqual(prevNode.properties, nextNode.properties) &&
      nodeArgsUnchanged(prevNode.nodes ?? [], nextNode.nodes ?? []) &&
      nodeArgsUnchanged(prevNode.actions ?? [], nextNode.actions ?? [])
    );
  });
};
