//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

export const FilesSettingsSchema = Schema.mutable(
  Schema.Struct({
    autoExport: Schema.Boolean,
    autoExportInterval: Schema.Number,
    openLocalFiles: Schema.optional(Schema.Boolean),
  }),
);

export type FilesSettingsProps = Schema.Schema.Type<typeof FilesSettingsSchema>;
