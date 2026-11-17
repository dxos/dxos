//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { trim } from '@dxos/util';

import { FinanceNamespace } from './src/namespace.ts';

const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: FinanceNamespace.key,
    name: 'Finance',
    author: 'DXOS',
    description: trim`
      Finance research over public sources that need no API key: market news, press releases,
      central-bank statements, Reddit, SEC filings, prices and short volume. Each source is ingested
      into an ECHO feed keyed by its origin, and a pipeline turns the feeds into one RDF fact store
      where news sentiment, prices and insider trades meet on the same company.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-finance',
    icon: { key: 'ph--chart-line--regular', hue: 'green' },
    spec: 'PLUGIN.mdl',
    tags: ['labs'],
  },
  modules: [AppCapability.schema(() => import('./src/capabilities/schema.ts', { with: { type: 'module-url' } }))],
});

export const { meta, make } = config;

export default config;
