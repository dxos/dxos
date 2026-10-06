//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

/** What the plugin keeps on this device: persisted locally and never synced, unlike its settings. */
export const State = Schema.Struct({
  /** The repository folder of each project, by project id; a path means nothing on another device. */
  repositories: Schema.optional(Schema.Record(Schema.String, Schema.String)),
}).mapFields(Struct.map(Schema.mutableKey));

export interface State extends Schema.Schema.Type<typeof State> {}
