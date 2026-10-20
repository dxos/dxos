//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Bounds, type Intent, Layer, Link, NodeBase, Point, Timeline, nodeBase } from './types.ts';

const isPoint = Schema.is(Point);
const isBounds = Schema.is(Bounds);
const isLayer = Schema.is(Layer);
const isLink = Schema.is(Link);
const isNode = Schema.is(NodeBase);
const isTimeline = Schema.is(Timeline);

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const isString = (value: unknown): value is string => typeof value === 'string';
const isStrings = (value: unknown): value is string[] => Array.isArray(value) && value.every(isString);

// A map, so a key such as `__proto__` in untrusted values finds no inherited member.
const sharedFields: ReadonlyMap<string, (value: unknown) => boolean> = new Map(
  Object.entries(nodeBase).map(([key, field]) => [key, Schema.is(field)]),
);

/** Edits never change `id` or `type`, and a shared field must keep its type; a type's own fields are its registry's to check. */
const isValues = (values: unknown): boolean =>
  isRecord(values) &&
  !('id' in values) &&
  !('type' in values) &&
  // A required field's schema refuses `undefined`, so an edit cannot clear it; an optional one's accepts it.
  Object.entries(values).every(([key, value]) => sharedFields.get(key)?.(value) ?? true);

/**
 * Whether a value is a well-formed `Intent`, its batches included: intents that arrive over an operation are
 * untyped, and a malformed one must be refused before it reaches the store rather than corrupt it.
 */
export const isIntent = (value: unknown): value is Intent => {
  if (!isRecord(value)) {
    return false;
  }

  switch (value.kind) {
    case 'move':
      return isStrings(value.ids) && isPoint(value.delta);
    case 'resize':
      return isString(value.id) && isBounds(value.bounds);
    case 'link':
      return isLink(value.link);
    case 'create':
      return isNode(value.node);
    case 'delete':
      return isStrings(value.ids);
    case 'reorder':
      return isString(value.id) && isString(value.z);
    case 'update':
      return isString(value.id) && isValues(value.values);
    case 'layout':
      return value.ids === undefined || isStrings(value.ids);
    case 'layer':
      return isLayer(value.layer);
    case 'removeLayer':
      return isString(value.id);
    case 'timeline':
      return value.timeline === undefined || isTimeline(value.timeline);
    case 'batch':
      return Array.isArray(value.intents) && value.intents.every(isIntent);
    default:
      return false;
  }
};
