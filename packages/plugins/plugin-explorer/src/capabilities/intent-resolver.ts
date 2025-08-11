//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, createResolver } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';

import { ExplorerAction, ViewType } from '../types';

export default () =>
  contributes(
    Capabilities.IntentResolver,
    createResolver({
      intent: ExplorerAction.Create,
      resolve: ({ name }) => ({
        data: { object: Obj.make(ViewType, { name, type: '' }) },
      }),
    }),
  );
