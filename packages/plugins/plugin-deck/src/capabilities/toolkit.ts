//
// Copyright 2025 DXOS.org
//

import * as Tool from '@effect/ai/Tool';
import * as Toolkit from '@effect/ai/Toolkit';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Capabilities, LayoutAction, type PluginContext, contributes, createIntent } from '@dxos/app-framework';
import { ArtifactId } from '@dxos/assistant';
import { type SpaceId } from '@dxos/keys';
import { trim } from '@dxos/util';

import { DeckCapabilities } from './capabilities';

class DeckToolkit extends Toolkit.make(
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
) {
  static layer = (context: PluginContext) =>
    DeckToolkit.toLayer({
      'open-item': ({ id }) =>
        Effect.gen(function* () {
          const state = context.getCapability(DeckCapabilities.DeckState);
          const dxn = ArtifactId.toDXN(id, state.activeDeck as SpaceId);

          // TODO(wittjosiah): Support other variants.
          const echoDxn = dxn.asEchoDXN();
          if (!echoDxn) {
            throw new Error(`Invalid object ID: ${id}`);
          }

          // TODO(wittjosiah): Get capabilities via layers.
          const { dispatch } = context.getCapability(Capabilities.IntentDispatcher);
          yield* dispatch(
            createIntent(LayoutAction.Open, {
              subject: [`${echoDxn.spaceId!}:${echoDxn.echoId}`],
              part: 'main',
            }),
          );
        }).pipe(Effect.orDie),
    });
}

export default (context: PluginContext) => [
  contributes(Capabilities.Toolkit, DeckToolkit),
  contributes(Capabilities.ToolkitHandler, DeckToolkit.layer(context)),
];
