//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import * as Plugin from '@dxos/app-framework/Plugin';
import * as Operation from '@dxos/compute/Operation';
import { DXN } from '@dxos/keys';

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

const PluginRejection = Schema.Struct({
  id: Schema.String,
  reason: Schema.String,
});

export const QueryPlugins = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.registry.queryPlugins'),
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

/**
 * User-initiated: enabling reshapes the workspace, so the assistant asks via its `plugin-prompt`
 * surface and this runs on the click, rather than being projected as an agent tool.
 */
/**
 * Void input so it can back a skill template's input, which invokes with no arguments: the
 * disabled set is rendered into the agent's prompt rather than fetched by a tool call it has to
 * think to make.
 */
export const QueryDisabledPlugins = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.registry.queryDisabledPlugins'),
    name: 'Query Disabled Plugins',
    description:
      'List the plugins installed on this host but not enabled. Their operations, types and skills ' +
      'are absent until the user enables them.',
    icon: 'ph--plugs--regular',
  },
  services: [Plugin.Service],
  input: Schema.Struct({}),
  output: Schema.Struct({
    plugins: Schema.Array(PluginSummary),
  }),
}).pipe(Operation.mutation('none'));

export const DisablePlugins = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.registry.disablePlugins'),
    name: 'Disable Plugins',
    description:
      'Disable enabled plugins by id. Enabled dependents are disabled with them, dependents first. ' +
      'Core plugins cannot be disabled and are reported as rejected.',
    icon: 'ph--plugs--regular',
  },
  services: [Plugin.Service],
  input: Schema.Struct({
    ids: Schema.Array(Schema.String).annotate({
      description: 'Ids of the plugins to disable, as reported by the plugin query.',
      examples: [['dxos.org/plugin/markdown', 'dxos.org/plugin/table']],
    }),
  }),
  output: Schema.Struct({
    disabled: Schema.Array(Schema.String).annotate({
      description: 'Ids now disabled, including dependents that went off and plugins already disabled.',
    }),
    rejected: Schema.Array(PluginRejection),
  }),
}).pipe(Operation.mutation('write'));

export const EnablePlugins = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.registry.enablePlugins'),
    name: 'Enable Plugins',
    description:
      'Enable installed plugins by id. Dependencies are enabled with them. A plugin the host does ' +
      'not have installed cannot be enabled here — it is reported as rejected.',
    icon: 'ph--plugs-connected--regular',
  },
  services: [Plugin.Service],
  input: Schema.Struct({
    ids: Schema.Array(Schema.String).annotate({
      description: 'Ids of the plugins to enable, as reported by the plugin query.',
      examples: [['dxos.org/plugin/markdown', 'dxos.org/plugin/table']],
    }),
  }),
  output: Schema.Struct({
    enabled: Schema.Array(Schema.String).annotate({
      description: 'Ids now enabled, including dependencies pulled in and plugins already enabled.',
    }),
    rejected: Schema.Array(PluginRejection),
  }),
}).pipe(Operation.mutation('write'));

/**
 * User-initiated, like {@link EnablePlugins}: loading runs code from the URL inside the host, so the
 * assistant offers it as a `plugin-url-prompt` surface and this runs on the user's click — it is
 * never projected as an agent tool.
 */
export const LoadPlugin = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.registry.loadPlugin'),
    name: 'Load Plugin',
    description: 'Load a plugin from the URL of its manifest.json and, unless told not to, enable it.',
    icon: 'ph--cloud-arrow-down--regular',
  },
  services: [Plugin.Service],
  input: Schema.Struct({
    url: Schema.String.annotate({
      description: 'URL of the plugin manifest, e.g. https://example.com/my-plugin/manifest.json.',
    }),
    enable: Schema.optional(Schema.Boolean).annotate({
      description:
        'Enable the plugin once it is loaded (default true); false leaves it listed but off, unless its id is already enabled (e.g. from an earlier session), in which case it starts.',
    }),
  }),
  output: Schema.Struct({
    id: Schema.String.annotate({ description: 'Id of the plugin that was loaded.' }),
    name: Schema.optional(Schema.String),
  }),
}).pipe(Operation.mutation('write'));
