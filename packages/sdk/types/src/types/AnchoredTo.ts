//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { DXN, Obj, Relation, Type } from '@dxos/echo';

export class AnchoredTo extends Type.makeRelation<AnchoredTo>(DXN.make('org.dxos.relation.anchoredTo', '0.1.0'))({
  source: Obj.Unknown,
  target: Obj.Unknown,
})(
  Schema.Struct({
    id: Obj.ID,
    anchor: Schema.optional(Schema.String),
    /** Branch the anchored thread pertains to (a branch-review comment); undefined = main/unbranched. */
    branch: Schema.optional(Schema.String),
  }),
) {}

export const make = (props: Relation.MakeProps<typeof AnchoredTo>) => Relation.make(AnchoredTo, props);

/** A step into the target, as in Automerge's ref paths: a key, an array index, or the array element matching fields. */
export type PathSegment = string | number | { readonly [field: string]: unknown };

/** A span of text inside the target: the path to its string and the Automerge cursors that bound the span. */
export type PathAnchor = { path: readonly PathSegment[]; from: string; to: string };

/** Keys that would read as another kind of segment take a leading backslash, as in Automerge. */
const ESCAPED_KEY = /^[@{[\\]/;

const formatSegment = (segment: PathSegment): string =>
  typeof segment === 'number'
    ? `@${segment}`
    : typeof segment === 'string'
      ? `${ESCAPED_KEY.test(segment) ? '%5C' : ''}${encodeURIComponent(segment)}`
      : encodeURIComponent(JSON.stringify(segment));

const parseSegment = (segment: string): PathSegment => {
  if (/^@\d+$/.test(segment)) {
    return Number(segment.slice(1));
  }
  if (segment.startsWith('%7B') || segment.startsWith('{')) {
    return JSON.parse(decodeURIComponent(segment));
  }
  return decodeURIComponent(segment.replace(/^(%5C|\\)/, ''));
};

/** A path in Automerge's ref syntax, relative to the target, e.g. `requirements/k/text`. */
export const formatPath = (path: readonly PathSegment[]): string => path.map(formatSegment).join('/');

/** Serializes a span as an Automerge ref path ending in a cursor range, e.g. `name/[2@a1-7@a1]`. */
export const formatPathAnchor = ({ path, from, to }: PathAnchor): string =>
  [...path.map(formatSegment), from === to ? `[${from}]` : `[${from}-${to}]`].join('/');

/** The span a path anchor names; undefined for an anchor in another format, such as a Markdown `from:to` range. */
export const parsePathAnchor = (anchor: string): PathAnchor | undefined => {
  const segments = anchor.split('/');
  const range = segments.pop()?.match(/^\[([^-\]]+)(?:-([^\]]+))?\]$/);
  if (!range) {
    return undefined;
  }
  try {
    return { path: segments.map(parseSegment), from: range[1], to: range[2] ?? range[1] };
  } catch {
    return undefined;
  }
};
