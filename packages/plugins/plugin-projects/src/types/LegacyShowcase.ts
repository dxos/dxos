//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { DXN, Obj, Ref, Type } from '@dxos/echo';
import { Text } from '@dxos/schema';

/**
 * The `Showcase` before showcases became presenter decks, kept solely so `Migration.define` can read existing data.
 * Never constructed by this plugin.
 */
export class Showcase extends Type.makeObject<Showcase>(DXN.make('org.dxos.type.showcase', '0.1.0'))(
  Schema.Struct({
    name: Schema.String,
    content: Ref.Ref(Text.Text),
    artifacts: Schema.Array(Ref.Ref(Obj.Unknown)),
  }),
) {}

/** `Demonstrates` 0.1.0, whose source had to be a {@link Showcase}. */
export class Demonstrates extends Type.makeRelation<Demonstrates>(DXN.make('org.dxos.relation.demonstrates', '0.1.0'))({
  source: Showcase,
  target: Obj.Unknown,
})(Schema.Struct({ id: Obj.ID })) {}
