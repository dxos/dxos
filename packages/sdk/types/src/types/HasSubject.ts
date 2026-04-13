//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Obj, Relation, Type } from '@dxos/echo';
import { Format } from '@dxos/echo/internal';

/** @deprecated Use HasSubject instead. */
export const LegacyHasSubject = Schema.Struct({
  id: Obj.ID,
  completedAt: Schema.String,
}).pipe(
  Type.relation({
    typename: 'org.dxos.relation.has-subject',
    version: '0.1.0',
    source: Obj.Unknown,
    target: Obj.Unknown,
  }),
);

export interface LegacyHasSubject extends Schema.Schema.Type<typeof LegacyHasSubject> {}

/**
 * @deprecated Reconcile with AnchoredTo?
 */
export const HasSubject = Schema.Struct({
  id: Obj.ID,
  completedAt: Format.DateTime,
}).pipe(
  Type.relation({
    typename: 'org.dxos.relation.hasSubject',
    version: '0.1.0',
    source: Obj.Unknown,
    target: Obj.Unknown,
  }),
);

/**
 * @deprecated Reconcile with AnchoredTo?
 */
export interface HasSubject extends Schema.Schema.Type<typeof HasSubject> {}

export const make = (props: Relation.MakeProps<typeof HasSubject>) => Relation.make(HasSubject, props);
