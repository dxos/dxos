//
// Copyright 2025 DXOS.org
//

import * as Equal from 'effect/Equal';
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

export type NodeArgsUnchangedOptions = {
  /**
   * Called for every action whose previous and offered `data` are both functions with the same context.
   * Returning true treats the action as unchanged; the callee is then responsible for making the stored node
   * run `data` with `context` from now on (the app graph's `retargetAction`). Without it, a re-created closure
   * reads as changed.
   */
  sameAction?: (id: string, data: (...args: any[]) => unknown, context: unknown) => boolean;
};

type ActionContextCarrier = { _actionContext?: unknown };

/**
 * Returns true if two NodeArg arrays are semantically identical (same id, type, data, properties per index).
 * Inline child nodes (the `nodes` field) are compared recursively.
 */
export const nodeArgsUnchanged = (
  prev: readonly Node.NodeArg<any>[],
  next: readonly Node.NodeArg<any>[],
  options: NodeArgsUnchangedOptions = {},
): boolean => {
  if (prev.length !== next.length) {
    return false;
  }

  return prev.every((prevNode, idx) => {
    const nextNode = next[idx];
    return (
      prevNode.id === nextNode.id &&
      prevNode.type === nextNode.type &&
      dataUnchanged(prevNode, nextNode, options) &&
      Equal.equals(prevNode.properties ?? {}, nextNode.properties ?? {}) &&
      nodeArgsUnchanged(prevNode.nodes ?? [], nextNode.nodes ?? [], options) &&
      nodeArgsUnchanged(prevNode.actions ?? [], nextNode.actions ?? [], options)
    );
  });
};

const dataUnchanged = (
  prevNode: Node.NodeArg<any>,
  nextNode: Node.NodeArg<any>,
  { sameAction }: NodeArgsUnchangedOptions,
): boolean => {
  // Builders rebuild an action's closure inline on every connector run, so its identity carries no
  // information; the context it runs with is attached per extension and stays stable, so it is compared.
  // A closure equal to the baseline still goes through `sameAction`: the baseline only advances when output
  // is applied, so the stored node may target a closure from a skipped run in between.
  if (
    sameAction !== undefined &&
    nextNode.type === Node.ActionType &&
    typeof prevNode.data === 'function' &&
    typeof nextNode.data === 'function'
  ) {
    const context = (nextNode as ActionContextCarrier)._actionContext;
    return (
      (prevNode as ActionContextCarrier)._actionContext === context && sameAction(nextNode.id, nextNode.data, context)
    );
  }
  return shallowEqual(prevNode.data, nextNode.data);
};
