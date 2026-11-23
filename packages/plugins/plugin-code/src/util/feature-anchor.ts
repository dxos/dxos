//
// Copyright 2026 DXOS.org
//

import { getRangeFromCursor, getTextInRange } from '@dxos/echo-client';
import { Doc } from '@dxos/echo-doc';
import { AnchoredTo } from '@dxos/types';

import { Feature } from '#types';

/** The text field of a feature a comment anchors into; a requirement is named by its key, never its position. */
export type Field = { field: 'name' } | { field: 'description' } | { field: 'requirement'; key: string };

/** The anchor path of a field, e.g. `requirements/<key>/text`: the key path of its string. */
export const getPath = (field: Field): Doc.KeyPath =>
  field.field === 'requirement' ? ['requirements', field.key, 'text'] : [field.field];

/** A path anchor resolved against the feature as it is now: the key path of its string and the field's order. */
export type Resolved = { path: Doc.KeyPath; from: string; to: string; order: number };

/** Resolves an anchor; undefined when it is not a path anchor or names a requirement that is gone. */
export const resolve = (feature: Feature.Feature, anchor: string): Resolved | undefined => {
  const parsed = AnchoredTo.parsePathAnchor(anchor);
  if (!parsed) {
    return undefined;
  }
  const { path, from, to } = parsed;
  const [field, match, leaf] = path;
  if (path.length === 1 && (field === 'name' || field === 'description')) {
    return { path: [field], from, to, order: field === 'name' ? 0 : 1 };
  }
  if (path.length === 3 && field === 'requirements' && leaf === 'text' && typeof match === 'string') {
    const index = Feature.getRequirements(feature).findIndex(({ key }) => key === match);
    return index === -1 ? undefined : { path: ['requirements', match, 'text'], from, to, order: 2 + index };
  }
  return undefined;
};

/** The text an anchor spans; undefined when it no longer resolves. */
export const getText = (feature: Feature.Feature, anchor: string): string | undefined => {
  const resolved = resolve(feature, anchor);
  try {
    return resolved && getTextInRange(Doc.createAccessor(feature, resolved.path), resolved.from, resolved.to);
  } catch {
    return undefined;
  }
};

/** Orders anchors as the feature reads: whole-feature threads first, then by field, then by position in it. */
export const compare = (feature: Feature.Feature, anchorA?: string, anchorB?: string): number => {
  const position = (anchor?: string): [number, number] => {
    const resolved = anchor ? resolve(feature, anchor) : undefined;
    if (!resolved) {
      return anchor ? [Number.MAX_SAFE_INTEGER, 0] : [-1, 0];
    }
    try {
      const range = getRangeFromCursor(Doc.createAccessor(feature, resolved.path), `${resolved.from}:${resolved.to}`);
      return [resolved.order, range?.start ?? 0];
    } catch {
      return [resolved.order, 0];
    }
  };
  const [orderA, startA] = position(anchorA);
  const [orderB, startB] = position(anchorB);
  return orderA - orderB || startA - startB;
};
