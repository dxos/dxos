//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import * as Plugin from '@dxos/app-framework/Plugin';
import * as Operation from '@dxos/compute/Operation';
import { DXN } from '@dxos/keys';

import { meta } from '#meta';

const makeKey = (name: string) => DXN.make(`${meta.profile.key}.operation.${name}`);

const PluginSummary = Schema.Struct({
  id: Schema.String.annotate({ description: 'Plugin id, as passed to plugin enable/disable.' }),
  name: Schema.optional(Schema.String),
  description: Schema.optional(Schema.String),
  core: Schema.Boolean.annotate({ description: 'Core plugins are always on and cannot be disabled.' }),
  enabled: Schema.Boolean,
  active: Schema.Boolean.annotate({
    description:
      'Whether any of the plugin’s modules have activated. An enabled plugin that is not active ' +
      'contributes nothing yet, so its operations are absent from this host.',
  }),
});

export const QueryPlugins = Operation.make({
  meta: {
    key: makeKey('queryPlugins'),
    name: 'Query Plugins',
    description:
      'List the plugins installed on this host, each with whether it is enabled and whether it has ' +
      'activated. What a plugin contributes — operations, types, skills — is only present once it is active.',
    icon: 'ph--plugs--regular',
  },
  services: [Plugin.Service],
  input: Schema.Struct({
    enabled: Schema.optional(Schema.Boolean).annotate({
      description: 'Restrict to enabled plugins. Omit to list everything installed.',
    }),
  }),
  output: Schema.Struct({
    plugins: Schema.Array(PluginSummary),
  }),
}).pipe(Operation.mutation('none'));
