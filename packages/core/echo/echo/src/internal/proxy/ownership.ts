//
// Copyright 2024 DXOS.org
//

import { invariant } from '@dxos/invariant';

import { KindId } from '../types';

import { queueOwnerNotification } from './change-context';
import { defineHiddenProperty } from './define-hidden-property';
import { getProxyTarget, isProxy, isValidProxyTarget } from './proxy-utils';
import { EventId } from './symbols';

/**
 * Symbol to store the owning ECHO object reference on nested JS objects (records).
 * Every nested record is attributed to exactly one ECHO object.
 * This achieves:
 * - No cycles in the object graph (cyclical Refs are still allowed).
 * - No multiple inbound pointers to one record.
 * - Centralized reactivity for entire ECHO object.
 */
const EchoOwner = Symbol.for('@dxos/echo/Owner');

/**
 * Get the raw target from a value, unwrapping proxy if needed.
 */
export const getRawTarget = (value: any): any => {
  return isProxy(value) ? getProxyTarget(value) : value;
};

/**
 * Get the ECHO object that owns this nested record.
 *
 * The owner is always the raw target object (not a proxy) of the root ECHO object.
 * For example, if you have `echoObject.nested.deep`, both `nested` and `deep`
 * will have their owner set to the raw target of `echoObject`.
 *
 * @param value - The nested record to check (can be a proxy or raw target).
 * @returns The raw target of the owning root ECHO object, or undefined if not owned.
 */
export const getOwner = (value: object | null | undefined): object | undefined => {
  return (value as any)?.[EchoOwner];
};

/**
 * Set the owner of a meta object to its parent.
 * This allows meta mutations to respect the parent's change context.
 * @internal
 */
export const setMetaOwner = (metaTarget: object, parent: object): void => {
  defineHiddenProperty(metaTarget, EchoOwner, parent);
};

/**
 * Set the ECHO object owner on a value and all its nested records.
 * All nested JS objects point directly to the root ECHO object.
 *
 * @param value - The value to set ownership on (can be a proxy or raw target).
 * @param owner - The raw target of the root ECHO object that will own this value.
 * @param options.visited - Set of already-visited objects to avoid infinite loops.
 * @param options.depth - Current recursion depth (unused, kept for debugging).
 * @param options.allowedPreviousOwner - When reassigning a root ECHO object, its nested structures
 *   are allowed to have this as their previous owner without triggering the invariant.
 */
export const setOwnerRecursive = (
  value: any,
  owner: object,
  options: {
    visited?: Set<object>;
    depth?: number;
    allowedPreviousOwner?: object;
  } = {},
): void => {
  const { visited = new Set<object>(), depth = 0, allowedPreviousOwner } = options;
  if (value == null || typeof value !== 'object') {
    return;
  }

  const actualValue = getRawTarget(value);
  if (visited.has(actualValue)) {
    return;
  }
  visited.add(actualValue);

  // Check that we're not stealing a nested record owned by a different ECHO object.
  // Root ECHO objects (those with EventId) can be reassigned - they maintain their own
  // identity and choosing to embed them in another object is a valid operation.
  // When reassigning a root, its nested records (owned by that root) are also allowed.
  const existingOwner = getOwner(actualValue);
  const isRootEchoObject = EventId in actualValue;

  // Track if this is a root being assigned - its nested structures are allowed to transfer.
  let newAllowedPreviousOwner = allowedPreviousOwner;
  if (isRootEchoObject && depth === 0) {
    // This is the top-level root being assigned; allow its nested structures to transfer.
    newAllowedPreviousOwner = actualValue;
  }

  if (!isRootEchoObject) {
    const ownershipAllowed =
      existingOwner == null || existingOwner === owner || existingOwner === newAllowedPreviousOwner;
    invariant(
      ownershipAllowed,
      'Cannot reassign ownership of a nested record to a different ECHO object. Use deep copy first.',
    );
  }

  // Set owner directly to the root ECHO object.
  defineHiddenProperty(actualValue, EchoOwner, owner);

  // Recursively set owner on nested objects and array elements.
  const recursiveOptions = {
    visited,
    depth: depth + 1,
    allowedPreviousOwner: newAllowedPreviousOwner,
  };
  if (Array.isArray(actualValue)) {
    for (const item of actualValue) {
      if (isValidProxyTarget(item) || isProxy(item)) {
        setOwnerRecursive(item, owner, recursiveOptions);
      }
    }
  } else {
    for (const key in actualValue) {
      if (Object.prototype.hasOwnProperty.call(actualValue, key)) {
        const nested = actualValue[key];
        if (isValidProxyTarget(nested) || isProxy(nested)) {
          setOwnerRecursive(nested, owner, recursiveOptions);
        }
      }
    }
  }
};

/**
 * Traverse an object graph, calling the visitor on each object.
 * Handles proxy unwrapping and cycle detection.
 *
 * @param value - The value to traverse (can be a proxy or raw target).
 * @param visitor - Called for each object. Return true to stop traversal (early exit).
 * @returns true if the visitor returns true for any object.
 */
export const traverseObjectGraph = (
  value: any,
  visitor: (actualValue: any) => boolean,
  visited = new Set<object>(),
): boolean => {
  if (value == null || typeof value !== 'object') {
    return false;
  }

  const actualValue = getRawTarget(value);

  if (visited.has(actualValue)) {
    return false;
  }
  visited.add(actualValue);

  if (visitor(actualValue)) {
    return true;
  }

  if (Array.isArray(actualValue)) {
    for (const item of actualValue) {
      if (traverseObjectGraph(item, visitor, visited)) {
        return true;
      }
    }
  } else {
    for (const key in actualValue) {
      if (Object.prototype.hasOwnProperty.call(actualValue, key)) {
        if (traverseObjectGraph(actualValue[key], visitor, visited)) {
          return true;
        }
      }
    }
  }

  return false;
};

/**
 * Check if a value would create a cycle when assigned to a target ECHO object.
 * Returns true if the value (or any nested object) IS the target root.
 */
export const wouldCreateCycle = (targetRoot: object, value: any): boolean =>
  traverseObjectGraph(value, (v) => v === targetRoot);

/**
 * Check if a value or any of its nested objects has an owner different from the target.
 * Used to determine if deep copy is needed during init.
 */
export const hasForeignOwner = (value: any, target: object): boolean =>
  traverseObjectGraph(value, (v) => {
    const owner = getOwner(v);
    if (owner != null && owner !== target) {
      return true;
    }
    // Root ECHO objects (with EventId) have their nested structures owned by them.
    if (EventId in v && v !== target) {
      return true;
    }
    return false;
  });

/**
 * Maximum depth for owner chain traversal.
 * This is a defensive measure against malformed circular ownership.
 * Primary cycle detection is handled by wouldCreateCycle() before assignment.
 */
const MAX_OWNER_DEPTH = 100;

/**
 * Get the root ECHO object for a target.
 * Follows the owner chain to find the ultimate root.
 * An object may have EventId (from being created standalone) but if it now
 * has an owner, it's nested and we should use its owner's root instead.
 * @internal
 */
export const getEchoRoot = (target: object, depth = 0): object => {
  invariant(depth < MAX_OWNER_DEPTH, 'Owner chain too deep - possible circular ownership');

  // Root ECHO objects (those created with Obj.make or Relation.make) have KindId set.
  // They maintain their own change context identity even when nested inside another object.
  // Nested helper objects like ObjectMeta don't have KindId and should follow their owner.
  if (KindId in target) {
    return target;
  }

  // For non-root objects (nested records, ObjectMeta, etc.), follow the owner chain.
  const owner = getOwner(target);
  if (owner) {
    return getEchoRoot(owner, depth + 1);
  }

  // No owner means this is an unowned object (e.g., during initialization).
  return target;
};

/**
 * Notify all owners in the ownership chain.
 * When a nested object changes, its parent should also be notified.
 * This handles the case where a root ECHO object is nested inside another object.
 */
export const notifyOwnerChain = (target: object): void => {
  const owner = getOwner(target);
  if (owner) {
    // Queue notification for the owner's root (which has EventId).
    queueOwnerNotification(getEchoRoot(owner));
    // Continue up the chain (owner might also be nested).
    notifyOwnerChain(owner);
  }
};
