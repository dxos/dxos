//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

/**
 * Which CrabNebula release channel this install pulls updates from. `stable` is the production
 * channel (published under CrabNebula's legacy `main` name — see `CHANNEL_NAME`).
 */
export const UpdateChannel = Schema.Literals(['stable', 'nightly']);
export type UpdateChannel = Schema.Schema.Type<typeof UpdateChannel>;

export const Settings = Schema.Struct({
  updateChannel: Schema.optional(UpdateChannel),
}).mapFields(Struct.map(Schema.mutableKey));

export interface Settings extends Schema.Schema.Type<typeof Settings> {}
