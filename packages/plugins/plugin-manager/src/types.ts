//
// Copyright 2025 DXOS.org
//

import { S } from '@dxos/echo-schema';

export const SettingsStateSchema = S.mutable(
  S.Struct({
    selected: S.String,
  }),
);

export type SettingsState = S.Schema.Type<typeof SettingsStateSchema>;
