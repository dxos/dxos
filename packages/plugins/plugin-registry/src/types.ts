//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

export const RegistrySettingsSchema = Schema.mutable(
  Schema.Struct({
    experimental: Schema.optional(Schema.Boolean),
  }),
);

export type RegistrySettings = Schema.Schema.Type<typeof RegistrySettingsSchema>;
