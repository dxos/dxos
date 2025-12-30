//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common, createIntent, createResolver } from '@dxos/app-framework';

import { SearchAction } from '../../types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(
      Common.Capability.IntentResolver,
      createResolver({
        intent: SearchAction.OpenSearch,
        resolve: () => ({
          intents: [
            createIntent(Common.LayoutAction.UpdateComplementary, { part: 'complementary', subject: 'search' }),
          ],
        }),
      }),
    ),
  ),
);
