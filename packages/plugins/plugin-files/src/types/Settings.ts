//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

export const Settings = Schema.mutable(
  Schema.Struct({
    autoExport: Schema.Boolean,
    autoExportInterval: Schema.Number,
    openLocalFiles: Schema.optional(Schema.Boolean),
  }),
);

export interface Settings extends Schema.Schema.Type<typeof Settings> {}
