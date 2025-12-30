//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common, createResolver } from '@dxos/app-framework';

import { Template } from '../../types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(
      Common.Capability.IntentResolver,
      createResolver({
        intent: Template.Create,
        resolve: ({ name }: { name: string }) => ({
          data: { object: Template.make({ name }) },
        }),
      }),
    ),
  ),
);
