//
// Copyright 2023 DXOS.org
//

import { type PluginMeta } from '@dxos/app-framework';

export const AUTOMATION_PLUGIN = 'dxos.org/plugin/automation';

export const ASSISTANT_DIALOG = `${AUTOMATION_PLUGIN}/assistant/dialog`;

export const meta = {
  id: AUTOMATION_PLUGIN,
  name: 'Automation',
  description:
    'The Automation tab allows you to trigger pre-defined workflows related to the element you are interacting with inside of Composer.',
  icon: 'ph--magic-wand--regular',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/experimental/plugin-automation',
  tags: ['experimental'],
} satisfies PluginMeta;
