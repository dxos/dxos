//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common, createResolver } from '@dxos/app-framework';
import { View } from '@dxos/schema';

import { Masonry, MasonryAction } from '../../types';

export default Capability.makeModule((context) =>
  Effect.succeed(
    Capability.contributes(Common.Capability.IntentResolver, [
      createResolver({
        intent: MasonryAction.CreateMasonry,
        resolve: async ({ db, name, typename }) => {
          const { view } = await View.makeFromDatabase({ db, typename });
          const masonry = Masonry.make({ name, view });
          return { data: { object: masonry } };
        },
      }),
    ]),
  ),
);
