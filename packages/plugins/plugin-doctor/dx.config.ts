//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { trim } from '@dxos/util';

import { DoctorNamespace } from './src/namespace.ts';
import * as DoctorCapabilities from './src/types/DoctorCapabilities.ts';
import * as DoctorEvents from './src/types/DoctorEvents.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: DoctorNamespace.key,
    name: 'Doctor',
    author: 'DXOS',
    description: trim`
      Doctor adds a self-introspection skill to Composer. When the skill
      is loaded the assistant gains access to the queryComposerLogs tool, which
      reads the browser tab's own NDJSON log store (populated by
      @dxos/log-store-idb) directly from IndexedDB - no log file download or
      external service required. The assistant can use this tool to investigate
      unexpected behaviour, count error occurrences, or explain what happened
      during a specific time window without leaving the chat.

      The query operation supports the same filtering vocabulary as the
      scripts/query-logs.mjs CLI: LOG_FILTER tokens (e.g. dxos.echo, !dxos.net),
      message and raw-JSON regular expressions, time bounds (ISO or epoch ms),
      and level allow-lists (T/D/V/I/W/E). Results can be projected to a subset
      of fields via the select parameter to keep responses concise, and output
      can be formatted as JSON, JSONL, or a human-readable pretty string matching
      the CLI's formatLine output.

      Aggregate queries are supported via groupBy and aggregate parameters.
      Setting groupBy to level, message, file, or a context path returns a ranked
      frequency table; aggregate=sample includes representative entries per
      bucket; aggregate=firstLast adds the earliest and latest timestamps so the
      assistant can identify when a recurring message started or stopped.

      Hard caps clamp limit and topK to 1000 and sampleSize to 25. The IDB
      cursor exits early once the requested number of un-filtered rows is
      collected, so cheap tail queries are fast even on a large log store. The
      truncated flag signals when results were capped so the assistant can
      prompt the user to narrow the query.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-doctor',
    icon: { key: 'ph--first-aid-kit--regular', hue: 'rose' },
    spec: 'PLUGIN.mdl',
    tags: ['labs'],
  },
  modules: [
    AppCapability.appGraphBuilder(
      () => import('./src/capabilities/app-graph-builder.ts', { with: { type: 'module-url' } }),
    ),
    Capability.lazyModule(
      'DiagnosticProviders',
      { provides: [DoctorCapabilities.DiagnosticProvider], activatesOn: DoctorEvents.Start },
      () => import('./src/capabilities/diagnostic-providers.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.operationHandler(
      () => import('./src/capabilities/operation-handler.ts', { with: { type: 'module-url' } }),
      {
        activatesOn: ActivationEvents.Idle,
      },
    ),
    AppCapability.pluginAsset({
      pluginId: DoctorNamespace.key,
      path: 'PLUGIN.mdl',
      content: () => import('./PLUGIN.mdl?raw', { with: { type: 'module-url' } }),
      mimeType: 'application/x-mdl',
    }),
    AppCapability.surface(() => import('./src/capabilities/react-surface.ts', { with: { type: 'module-url' } }), {
      roles: ['org.dxos.role.deckCompanion.diagnostics'],
    }),
    AppCapability.skillDefinition(
      () => import('./src/capabilities/skill-definition.ts', { with: { type: 'module-url' } }),
    ),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } })),
  ],
});

export const { meta, make } = config;

export default config;
