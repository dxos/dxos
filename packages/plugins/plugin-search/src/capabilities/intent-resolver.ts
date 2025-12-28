//
// Copyright 2025 DXOS.org
//

import {
  Capabilities,
  Capability,
  LayoutAction,
  createIntent,
  createResolver,
} from '@dxos/app-framework';

import { SearchAction } from '../types';

export default Capability.makeModule(() =>
  Capability.contributes(
    Capabilities.IntentResolver,
    createResolver({
      intent: SearchAction.OpenSearch,
      resolve: () => ({
        intents: [createIntent(LayoutAction.UpdateComplementary, { part: 'complementary', subject: 'search' })],
      }),
    }),
  ),
);
