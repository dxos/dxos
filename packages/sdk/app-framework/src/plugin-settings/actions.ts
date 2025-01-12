//
// Copyright 2023 DXOS.org
//

import { S } from '@dxos/echo-schema';

export const SETTINGS_PLUGIN = 'dxos.org/plugin/settings';
export const SETTINGS_ACTION = `${SETTINGS_PLUGIN}/action`;

export namespace SettingsAction {
  export class Open extends S.TaggedClass<Open>()(`${SETTINGS_ACTION}/open`, {
    input: S.Struct({
      plugin: S.optional(S.String),
    }),
    output: S.Void,
  }) {}
}
