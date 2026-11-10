//
// Copyright 2026 DXOS.org
//

import { type Obj } from '@dxos/echo';
import { getRangeFromCursor, getTextInRange } from '@dxos/echo-client';
import { Doc } from '@dxos/echo-doc';
import { AnchoredTo } from '@dxos/types';

/** The text fields of a project or a spec that take path anchors, in the order they read. */
const FIELDS = ['name', 'description'] as const;

/** A path anchor resolved against one of the object's text fields. */
export type Resolved = { field: (typeof FIELDS)[number]; from: string; to: string };

/** Resolves an anchor; undefined when it is not a path anchor into `name` or `description`. */
export const resolve = (anchor: string): Resolved | undefined => {
  const parsed = AnchoredTo.parsePathAnchor(anchor);
  const [field] = parsed?.path ?? [];
  return parsed && parsed.path.length === 1 && FIELDS.includes(field as Resolved['field'])
    ? { field: field as Resolved['field'], from: parsed.from, to: parsed.to }
    : undefined;
};

/** The text an anchor spans; undefined when it no longer resolves. */
export const getText = (object: Obj.Unknown, anchor: string): string | undefined => {
  const resolved = resolve(anchor);
  try {
    return resolved && getTextInRange(Doc.createAccessor(object, [resolved.field]), resolved.from, resolved.to);
  } catch {
    return undefined;
  }
};

/** Where an anchor reads in the object: by field, then by position in it; undefined when it no longer resolves. */
export const getPosition = (object: Obj.Unknown, anchor: string): [order: number, start: number] | undefined => {
  const resolved = resolve(anchor);
  if (!resolved) {
    return undefined;
  }
  try {
    const range = getRangeFromCursor(Doc.createAccessor(object, [resolved.field]), `${resolved.from}:${resolved.to}`);
    return [FIELDS.indexOf(resolved.field), range?.start ?? 0];
  } catch {
    return [FIELDS.indexOf(resolved.field), 0];
  }
};
