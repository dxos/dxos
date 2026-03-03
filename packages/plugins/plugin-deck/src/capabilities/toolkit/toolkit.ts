//
// Copyright 2025 DXOS.org
//

import * as Tool from '@effect/ai/Tool';
import * as Toolkit from '@effect/ai/Toolkit';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Capabilities, Capability, type CapabilityManager } from '@dxos/app-framework';
import { AppCapabilities, LayoutOperation } from '@dxos/app-toolkit';
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

  export const createLayer = (capabilityManager: CapabilityManager.CapabilityManager) =>
    Toolkit$.toLayer({
      'open-item': ({ id }) =>
        Effect.gen(function* () {
          const registry = capabilityManager.get(Capabilities.AtomRegistry);
          const stateAtom = capabilityManager.get(DeckCapabilities.State);
          const state = registry.get(stateAtom);
          const dxn = ArtifactId.toDXN(id, state.activeDeck as SpaceId).asEchoDXN();
          if (!dxn) {
            // TODO(wittjosiah): Support other variants.
            throw new Error(`Invalid object ID: ${id}`);
          }

          // TODO(wittjosiah): Get capabilities via layers.
          const { invoke } = capabilityManager.get(Capabilities.OperationInvoker);
          yield* invoke(LayoutOperation.Open, { subject: [`${dxn.spaceId!}:${dxn.echoId}`] });
        }).pipe(Effect.orDie),
    });
}

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilityManager = yield* Capability.Service;

    return Capability.contributes(
      AppCapabilities.Toolkit,
      GenericToolkit.make(DeckToolkit.Toolkit, DeckToolkit.createLayer(capabilityManager)),
    );
  }),
);
