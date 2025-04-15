//
// Copyright 2025 DXOS.org
//

import { contributes, Capabilities, createResolver } from '@dxos/app-framework';
import { create } from '@dxos/live-object';

import { ExplorerAction, ViewType } from '../types';

export default () =>
  contributes(
    Capabilities.IntentResolver,
    createResolver({
      intent: ExplorerAction.Create,
      resolve: ({ name }) => ({
        data: { object: create(ViewType, { name, type: '' }) },
      }),
    }),
  );
