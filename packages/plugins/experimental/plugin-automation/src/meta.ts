//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

export const AUTOMATION_PLUGIN = 'dxos.org/plugin/automation';

export const meta = {
  id: AUTOMATION_PLUGIN,
  name: 'Automation',
  description: `Nested inside of your complimentary sidebar (right side of your interface) the Automation tab allows you to trigger pre-defined workflows related to the element you are interacting with inside of Composer.`,
  icon: 'ph--magic-wand--regular',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/experimental/plugin-automation',
  tags: ['experimental'],
  screenshots: ['https://dxos.network/plugin-details-automations-dark.png'],
} satisfies PluginMeta;
