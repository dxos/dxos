//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

import { meta } from './meta';

// TODO(burdon): Document.
export const SETTINGS_ID = '!dxos:settings';
export const SETTINGS_KEY = 'settings';

export namespace SettingsAction {
  export class Open extends Schema.TaggedClass<Open>()(`${meta.id}/open`, {
    input: Schema.Struct({
      plugin: Schema.optional(Schema.String),
    }),
    output: Schema.Void,
  }) {}

  export class OpenPluginRegistry extends Schema.TaggedClass<OpenPluginRegistry>()(`${meta.id}/open-plugin-registry`, {
    input: Schema.Void,
    output: Schema.Void,
  }) {}
}
