//
// Copyright 2025 DXOS.org
//

import { AiTool, AiToolkit } from '@effect/ai';
import { Effect, Schema } from 'effect';

import { Capabilities, LayoutAction, type PluginContext, contributes, createIntent } from '@dxos/app-framework';

class DeckToolkit extends AiToolkit.make(
  AiTool.make('show', {
    description:
      'Show an item as a companion to an existing plank. This will make the item appear alongside the primary content. When supplying IDs, they must be fully qualified like space:object.',
    parameters: {
      // TODO(wittjosiah): Currently the chat is calling this with a dxn consistently.
      id: Schema.String.annotations({
        description: 'The ID of the item to show.',
      }),
    },
    success: Schema.Any,
    failure: Schema.Never,
  }),
) {
  static layer = (context: PluginContext) =>
    DeckToolkit.toLayer({
      show: ({ id }) =>
        Effect.gen(function* () {
          // TODO(wittjosiah): Get capabilities via layers.
          const { dispatch } = context.getCapability(Capabilities.IntentDispatcher);
          yield* dispatch(
            createIntent(LayoutAction.Open, {
              subject: [id],
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
