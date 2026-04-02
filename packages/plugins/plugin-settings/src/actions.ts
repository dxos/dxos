//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

import { meta } from './meta';
import { SETTINGS_ID, SETTINGS_KEY } from './types';

export { SETTINGS_ID, SETTINGS_KEY };

export namespace SettingsAction {
  export class Open extends Schema.TaggedClass<Open>()(`${meta.id}.open`, {
    input: Schema.Struct({
      plugin: Schema.optional(Schema.String),
    }),
    output: Schema.Void,
  }) {}

  export class OpenPluginRegistry extends Schema.TaggedClass<OpenPluginRegistry>()(`${meta.id}.open-plugin-registry`, {
    input: Schema.Void,
    output: Schema.Void,
  }) {}
}
