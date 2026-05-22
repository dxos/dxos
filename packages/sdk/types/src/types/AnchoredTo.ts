//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { DXN, Obj, Relation, Type } from '@dxos/echo';

/** @deprecated Use AnchoredTo instead. */
export const LegacyAnchoredTo = Schema.Struct({
  id: Obj.ID,
  anchor: Schema.optional(Schema.String),
}).pipe(
  Type.relation({
    dxn: DXN.fromNsidAndVersion('org.dxos.relation.anchored-to', '0.1.0'),
    source: Obj.Unknown,
    target: Obj.Unknown,
  }),
);

export interface LegacyAnchoredTo extends Schema.Schema.Type<typeof LegacyAnchoredTo> {}

export const AnchoredTo = Schema.Struct({
  id: Obj.ID,
  anchor: Schema.optional(Schema.String),
}).pipe(
  Type.relation({
    dxn: DXN.fromNsidAndVersion('org.dxos.relation.anchoredTo', '0.1.0'),
    source: Obj.Unknown,
    target: Obj.Unknown,
  }),
);

export interface AnchoredTo extends Schema.Schema.Type<typeof AnchoredTo> {}

export const make = (props: Relation.MakeProps<typeof AnchoredTo>) => Relation.make(AnchoredTo, props);
