//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { DXN } from '@dxos/keys';

const SETTINGS_PLUGIN = 'org.dxos.plugin.settings';
const SETTINGS_OPERATION = `${SETTINGS_PLUGIN}.operation`;

export const Open = Operation.make({
  meta: {
    key: DXN.make(`${SETTINGS_OPERATION}.open`),
    name: 'Open Settings',
    description: 'Open the settings panel.',
    icon: 'ph--gear--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    plugin: Schema.optional(Schema.String.annotations({ description: 'The plugin to open settings for.' })),
  }),
  output: Schema.Void,
});

export const OpenPluginRegistry = Operation.make({
  meta: {
    key: DXN.make(`${SETTINGS_OPERATION}.openPluginRegistry`),
    name: 'Open Plugin Registry',
    description: 'Open the plugin registry.',
    icon: 'ph--plugs--regular',
  },
  services: [Capability.Service],
  input: Schema.Void,
  output: Schema.Void,
});
