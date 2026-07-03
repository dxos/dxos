//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as PageAction from './PageAction';

const base = { version: Schema.Literal(1), id: Schema.String };

export const List = Schema.TaggedStruct('page-actions.list', { ...base });
export const ListAck = Schema.Union(
  Schema.TaggedStruct('page-actions.list-ack', {
    ...base,
    ok: Schema.Literal(true),
    actions: Schema.Array(PageAction.Descriptor),
  }),
  Schema.TaggedStruct('page-actions.list-ack', { ...base, ok: Schema.Literal(false), error: Schema.String }),
);
export const Invoke = Schema.TaggedStruct('page-actions.invoke', {
  ...base,
  actionId: Schema.String,
  page: PageAction.PageInfo,
  inputs: Schema.Unknown,
  invokedFrom: Schema.Literal('popup', 'contextMenu', 'picker'),
});
export const InvokeAck = Schema.Union(
  Schema.TaggedStruct('page-actions.invoke-ack', {
    ...base,
    ok: Schema.Literal(true),
    objectId: Schema.optional(Schema.String),
  }),
  Schema.TaggedStruct('page-actions.invoke-ack', { ...base, ok: Schema.Literal(false), error: Schema.String }),
);
export const Ready = Schema.TaggedStruct('page-actions.ready', { ...base });

/** The full set of protocol messages. Extend by adding a variant here. */
export const Union = Schema.Union(List, ListAck, Invoke, InvokeAck, Ready);
export type Type = Schema.Schema.Type<typeof Union>;

/**
 * `Omit` applied to a union takes the intersection of member keys (via `keyof`), silently
 * dropping fields that only exist on some members (e.g. `actions` on the `ok: true` branch
 * of `ListAck`). Distributing over `T` first applies `Omit` per-member instead.
 */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/** Construct a message, defaulting `version` to 1. */
export const make = <T extends Type['_tag']>(
  tag: T,
  fields: DistributiveOmit<Extract<Type, { _tag: T }>, '_tag' | 'version'> & { version?: 1 },
): Extract<Type, { _tag: T }> => {
  // The generic tag parameter erases which union member `fields` belongs to, so the
  // spread cannot be proven by the checker to reconstruct that specific variant; the
  // `unknown`-typed local gives the checker an unambiguous starting point, and this
  // assertion re-establishes the tag <-> fields relationship the union already guarantees.
  const built: unknown = { _tag: tag, version: 1, ...fields };
  return built as Extract<Type, { _tag: T }>;
};
