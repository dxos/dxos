//
// Copyright 2025 DXOS.org
//

import * as Node from './node';

/**
 * Key separators for compound string keys used across the app-graph package.
 * `primary` separates top-level components (e.g., node ID from relation).
 * `secondary` separates sub-components within an encoded value (e.g., relation kind from direction).
 * Two distinct characters are needed because secondary separators appear inside primary-separated fields.
 */
export const Separators = {
  primary: '\u0001',
  secondary: '\u0002',
} as const;

/**
 * Normalize a relation input to a full Relation object.
 */
export const normalizeRelation = (relation?: Node.RelationInput): Node.Relation =>
  relation == null ? Node.childRelation() : typeof relation === 'string' ? Node.relation(relation) : relation;

/**
 * Shallow-compare two values: same reference, or same own-keys with === values.
 */
export const shallowEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (a == null || b == null || typeof a !== 'object' || typeof b !== 'object') return false;
  const keysA = Object.keys(a as Record<string, unknown>);
  const keysB = Object.keys(b as Record<string, unknown>);
  if (keysA.length !== keysB.length) {
    return false;
  }
  return keysA.every((k) => (a as Record<string, unknown>)[k] === (b as Record<string, unknown>)[k]);
};

/**
 * Returns true if two NodeArg arrays are semantically identical (same id, type, data, properties per index).
 */
export const nodeArgsUnchanged = (prev: Node.NodeArg<any>[], next: Node.NodeArg<any>[]): boolean => {
  if (prev.length !== next.length) {
    return false;
  }

  return prev.every((prevNode, idx) => {
    const nextNode = next[idx];
    return (
      prevNode.id === nextNode.id &&
      prevNode.type === nextNode.type &&
      shallowEqual(prevNode.data, nextNode.data) &&
      shallowEqual(prevNode.properties, nextNode.properties)
    );
  });
};
