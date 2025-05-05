//
// Copyright 2025 DXOS.org
//

import { contributes, Capabilities, createResolver, LayoutAction, createIntent } from '@dxos/app-framework';

import { SearchAction } from '../types';

export default () =>
  contributes(
    Capabilities.IntentResolver,
    createResolver({
      intent: SearchAction.OpenSearch,
      resolve: () => ({
        intents: [createIntent(LayoutAction.UpdateComplementary, { part: 'complementary', subject: 'search' })],
      }),
    }),
  );
