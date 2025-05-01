//
// Copyright 2025 DXOS.org
//

import { contributes, Capabilities, createResolver } from '@dxos/app-framework';
import { live } from '@dxos/live-object';

import { ExplorerAction, ViewType } from '../types';

export default () =>
  contributes(
    Capabilities.IntentResolver,
    createResolver({
      intent: ExplorerAction.Create,
      resolve: ({ name }) => ({
        data: { object: live(ViewType, { name, type: '' }) },
      }),
    }),
  );
