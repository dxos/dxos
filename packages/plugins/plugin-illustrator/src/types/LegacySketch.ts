//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { DXN, Ref, Type } from '@dxos/echo';

import { Canvas } from './Drawing';

/**
 * The pre-rename `Sketch` object, kept solely so `Migration.define` can read existing data and
 * convert it to {@link Drawing}. Never constructed by this plugin.
 *
 * Its canvas already points at `org.dxos.type.canvas` carrying `schema: 'tldraw.com/2'`, which is
 * exactly the base `Drawing.Canvas` — so only the wrapper needs migrating.
 */
export class Sketch extends Type.makeObject<Sketch>(DXN.make('org.dxos.type.sketch', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    canvas: Ref.Ref(Canvas),
  }),
) {}
