//
// Copyright 2023 DXOS.org
//

import { Schema as S } from '@effect/schema';

export const SETTINGS_PLUGIN = 'dxos.org/plugin/settings';
export const SETTINGS_ACTION = `${SETTINGS_PLUGIN}/action`;
export const SETTINGS_ID = 'dxos:settings';
export const SETTINGS_KEY = 'settings';

export namespace SettingsAction {
  export class Open extends S.TaggedClass<Open>()(`${SETTINGS_ACTION}/open`, {
    input: S.Struct({
      plugin: S.optional(S.String),
    }),
    output: S.Void,
  }) {}

  export class OpenPluginRegistry extends S.TaggedClass<OpenPluginRegistry>()(
    `${SETTINGS_ACTION}/open-plugin-registry`,
    {
      input: S.Void,
      output: S.Void,
    },
  ) {}
}
