//
// Copyright 2025 DXOS.org
//

import * as Tool from '@effect/ai/Tool';
import * as Toolkit from '@effect/ai/Toolkit';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Capability, Common } from '@dxos/app-framework';
import { GenericToolkit } from '@dxos/assistant';
import { ArtifactId } from '@dxos/assistant';
import { type SpaceId } from '@dxos/keys';
import { trim } from '@dxos/util';

import { DeckCapabilities } from '../../types';

const Toolkit$ = Toolkit.make(
  Tool.make('open-item', {
    description: trim`
      Opens an item in the application.
    `,
    parameters: {
      id: ArtifactId,
    },
    success: Schema.Any,
    failure: Schema.Never,
  }),
);

export namespace DeckToolkit {
  export const Toolkit = Toolkit$;

  export const createLayer = (context: Capability.PluginContext) =>
    Toolkit$.toLayer({
      'open-item': ({ id }) =>
        Effect.gen(function* () {
          const state = context.getCapability(DeckCapabilities.DeckState);
          const dxn = ArtifactId.toDXN(id, state.activeDeck as SpaceId).asEchoDXN();
          if (!dxn) {
            // TODO(wittjosiah): Support other variants.
            throw new Error(`Invalid object ID: ${id}`);
          }

          // TODO(wittjosiah): Get capabilities via layers.
          const { invoke } = context.getCapability(Common.Capability.OperationInvoker);
          yield* invoke(Common.LayoutOperation.Open, { subject: [`${dxn.spaceId!}:${dxn.echoId}`] });
        }).pipe(Effect.orDie),
    });
}

export default Capability.makeModule((context) =>
  Effect.succeed(
    Capability.contributes(
      Common.Capability.Toolkit,
      GenericToolkit.make(DeckToolkit.Toolkit, DeckToolkit.createLayer(context)),
    ),
  ),
);
