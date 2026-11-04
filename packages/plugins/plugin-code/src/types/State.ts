//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

/** What the plugin keeps on this device: persisted locally and never synced, unlike its settings. */
export const State = Schema.Struct({
  /** The features whose spec sections are folded to their header row, by feature id. */
  collapsed: Schema.optional(Schema.Record(Schema.String, Schema.Boolean)),
}).mapFields(Struct.map(Schema.mutableKey));

export interface State extends Schema.Schema.Type<typeof State> {}
