//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

export const Settings = Schema.Struct({
  /** Download and apply an update while the app starts. Unset follows the plugin's `defaultAutoUpdate`. */
  autoUpdate: Schema.optional(Schema.Boolean),
}).mapFields(Struct.map(Schema.mutableKey));

export interface Settings extends Schema.Schema.Type<typeof Settings> {}
