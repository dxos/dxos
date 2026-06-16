//
// Copyright 2025 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { DXN } from '@dxos/keys';

export const meta = Plugin.makeMeta({
  key: DXN.make('org.dxos.plugin.onboarding'),
  name: 'Onboarding',
  author: 'DXOS',
  tags: ['system'],
});
