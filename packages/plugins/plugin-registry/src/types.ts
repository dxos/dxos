//
// Copyright 2025 DXOS.org
//

import { S } from '@dxos/echo-schema';

export const RegistrySettingsSchema = S.mutable(
  S.Struct({
    experimental: S.optional(S.Boolean),
  }),
);

export type RegistrySettings = S.Schema.Type<typeof RegistrySettingsSchema>;
