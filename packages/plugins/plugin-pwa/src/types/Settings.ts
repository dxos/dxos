//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

export const Settings = Schema.Struct({
  /** Apply an update found at boot before the app shows. */
  autoUpdate: Schema.optional(Schema.Boolean),
}).mapFields(Struct.map(Schema.mutableKey));

export interface Settings extends Schema.Schema.Type<typeof Settings> {}
