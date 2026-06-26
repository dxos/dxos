//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

import { meta } from '#meta';
import { SETTINGS_ID, SETTINGS_KEY } from '#types';

export { SETTINGS_ID, SETTINGS_KEY };

export namespace SettingsAction {
  export class Open extends Schema.TaggedClass<Open>()(`${meta.profile.key}.open`, {
    input: Schema.Struct({
      plugin: Schema.optional(Schema.String),
    }),
    output: Schema.Void,
  }) {}

  export class OpenPluginRegistry extends Schema.TaggedClass<OpenPluginRegistry>()(
    `${meta.profile.key}.openPluginRegistry`,
    {
      input: Schema.Void,
      output: Schema.Void,
    },
  ) {}
}
