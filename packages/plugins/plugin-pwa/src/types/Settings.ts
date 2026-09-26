//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

/**
 * Empty by design: the panel exists to host the update row, whose state lives in the update manager
 * rather than in persisted settings. Registered anyway because that is what puts the plugin in the
 * settings list at all.
 */
export const Settings = Schema.Struct({}).mapFields(Struct.map(Schema.mutableKey));

export interface Settings extends Schema.Schema.Type<typeof Settings> {}
