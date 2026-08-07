//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

/**
 * Which CrabNebula release channel this install pulls updates from. `stable` is the production
 * channel (published under CrabNebula's legacy `main` name — see `updateChannelName`).
 */
export const UpdateChannel = Schema.Literal('stable', 'nightly');
export type UpdateChannel = Schema.Schema.Type<typeof UpdateChannel>;

export const Settings = Schema.mutable(
  Schema.Struct({
    updateChannel: Schema.optional(UpdateChannel),
  }),
);

export interface Settings extends Schema.Schema.Type<typeof Settings> {}
