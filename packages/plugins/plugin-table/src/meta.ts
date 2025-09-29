//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

export const meta: PluginMeta = {
  id: 'dxos.org/plugin/table',
  name: 'Tables',
  description:
    'Tables in Composer allow you to create or display structured data. Composer Tables store their data locally inside of your ECHO database and can be linked to one another relationally. Tables can be created manually, or by prompting your AI chat assistant. Like all other plugins, Table data is available to the LLM in real time to provide additional content for any automated workflow.',
  icon: 'ph--table--regular',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-table',
  screenshots: ['https://dxos.network/plugin-details-tables-dark.png'],
};
