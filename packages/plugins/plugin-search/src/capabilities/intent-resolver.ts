//
// Copyright 2025 DXOS.org
//

import {
  Capabilities,
  LayoutAction,
  contributes,
  createIntent,
  createResolver,
  defineCapabilityModule,
} from '@dxos/app-framework';

import { SearchAction } from '../types';

export default defineCapabilityModule(() =>
  contributes(
    Capabilities.IntentResolver,
    createResolver({
      intent: SearchAction.OpenSearch,
      resolve: () => ({
        intents: [createIntent(LayoutAction.UpdateComplementary, { part: 'complementary', subject: 'search' })],
      }),
    }),
  ),
);
