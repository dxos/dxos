//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

import * as Operation from '@dxos/operation';

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

const SETTINGS_OPERATION = `${meta.id}/operation`;

/**
 * Operations for the Settings plugin.
 */
export namespace SettingsOperation {
  export const Open = Operation.make({
    meta: {
      key: `${SETTINGS_OPERATION}/open`,
      name: 'Open Settings',
      description: 'Open the settings panel.',
    },
    schema: {
      input: Schema.Struct({
        plugin: Schema.optional(Schema.String.annotations({ description: 'The plugin to open settings for.' })),
      }),
      output: Schema.Void,
    },
  });

  export const OpenPluginRegistry = Operation.make({
    meta: {
      key: `${SETTINGS_OPERATION}/open-plugin-registry`,
      name: 'Open Plugin Registry',
      description: 'Open the plugin registry.',
    },
    schema: {
      input: Schema.Void,
      output: Schema.Void,
    },
  });
}
