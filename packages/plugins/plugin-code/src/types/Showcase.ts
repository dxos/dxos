//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { DXN, Migration, Obj, Relation, Type } from '@dxos/echo';

import * as LegacyShowcase from './LegacyShowcase.ts';

/**
 * Source demonstrates the target, a `Feature` or a `Task`. The source is the showcase, a presenter deck
 * (`org.dxos.type.presentation`), typed loosely because plugin-presenter depends on this plugin.
 */
export class Demonstrates extends Type.makeRelation<Demonstrates>(DXN.make('org.dxos.relation.demonstrates', '0.2.0'))({
  source: Obj.Unknown,
  target: Obj.Unknown,
})(Schema.Struct({ id: Obj.ID })) {}

export const makeDemonstrates = (props: Relation.MakeProps<typeof Demonstrates>) => Relation.make(Demonstrates, props);

/**
 * `Demonstrates` 0.1.0 → 0.2.0, whose source may be any object since a showcase is a presenter deck. Each edge keeps
 * its id and endpoints; plugin-presenter turns the `Showcase` at its source into a `Presentation` in place.
 */
export const demonstratesMigration = Migration.define({
  from: LegacyShowcase.Demonstrates,
  to: Demonstrates,
  // The endpoints are named only for the result's type: the replace keeps the edge's stored source and target.
  transform: async (from) => ({ [Relation.Source]: from[Relation.Source], [Relation.Target]: from[Relation.Target] }),
});
