//
// Copyright 2025 DXOS.org
//

import * as Atom from 'effect/reactivity/Atom';

import { shallowEqual } from '@dxos/util';

import * as Node from './AppGraphNode.ts';

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
  relation == null ? Node.child : typeof relation === 'string' ? Node.relation(relation) : relation;

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
      propertiesEqual(prevNode.properties, nextNode.properties) &&
      nodeArgsUnchanged(prevNode.nodes ?? [], nextNode.nodes ?? []) &&
      nodeArgsUnchanged(prevNode.actions ?? [], nextNode.actions ?? [])
    );
  });
};

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype;

/**
 * Structural equality for the plain values builders put in node properties: a builder rebuilds them
 * on every run, so a label tuple such as `['key', { ns }]` is a new array each time. Depth-bounded,
 * and anything but arrays and plain objects is compared by identity.
 */
export const valueEqual = (left: unknown, right: unknown, depth = 4): boolean => {
  if (left === right) {
    return true;
  }
  if (depth === 0) {
    return false;
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((item, index) => valueEqual(item, right[index], depth - 1))
    );
  }
  if (!isPlainRecord(left) || !isPlainRecord(right)) {
    return false;
  }
  const keys = Object.keys(left);
  return (
    keys.length === Object.keys(right).length &&
    keys.every((key) => Object.hasOwn(right, key) && valueEqual(left[key], right[key], depth - 1))
  );
};

/** Whether two property bags hold the same keys with {@link valueEqual} values. */
export const propertiesEqual = (
  left: Record<string, unknown> | undefined,
  right: Record<string, unknown> | undefined,
): boolean => valueEqual(left ?? {}, right ?? {}, 5);
