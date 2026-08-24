//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { DXN } from '@dxos/keys';

const SETTINGS_PLUGIN = 'org.dxos.plugin.settings';
const SETTINGS_OPERATION = `${SETTINGS_PLUGIN}.operation`;

export const Open = Operation.make({
  meta: {
    // Not `…appToolkit.open` — that is LayoutOperation's, and a shared key makes the pair
    // unresolvable by key alone. Matches its sibling `openPluginRegistry`.
    key: DXN.make('org.dxos.operation.appToolkit.openSettings'),
    name: 'Open Settings',
    description: 'Open the settings panel.',
    icon: 'ph--gear--regular',
  },
  services: [Capability.Service],
  input: Schema.Struct({
    plugin: Schema.optional(Schema.String.annotate({ description: 'The plugin to open settings for.' })),
  }),
  output: Schema.Void,
});

export const OpenPluginRegistry = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.appToolkit.openPluginRegistry'),
    name: 'Open Plugin Registry',
    description: 'Open the plugin registry.',
    icon: 'ph--plugs--regular',
  },
  services: [Capability.Service],
  input: Schema.Void,
  output: Schema.Void,
});
