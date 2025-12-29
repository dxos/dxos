//
// Copyright 2025 DXOS.org
//

import { Capability, Common, createIntent, createResolver } from '@dxos/app-framework';

import { SearchAction } from '../types';

export default Capability.makeModule(() =>
  Capability.contributes(
    Common.Capability.IntentResolver,
    createResolver({
      intent: SearchAction.OpenSearch,
      resolve: () => ({
        intents: [createIntent(Common.LayoutAction.UpdateComplementary, { part: 'complementary', subject: 'search' })],
      }),
    }),
  ),
);
