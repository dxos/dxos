//
// Copyright 2025 DXOS.org
//

import {
  Capabilities,
  contributes,
  createIntent,
  NavigationAction,
  type PromiseIntentDispatcher,
} from '@dxos/app-framework';
import { defineTool, ToolResult } from '@dxos/artifact';
import { S } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';

// TODO(burdon): Factor out.
declare global {
  interface ToolContextExtensions {
    dispatch?: PromiseIntentDispatcher;
  }
}

export default () =>
  contributes(Capabilities.Tools, [
    defineTool({
      name: 'show',
      // TODO(ZaymonFC): We should update the prompt to teach the LLM the difference between object ids and fully qualified ids.
      description:
        'Show an item in the app. Use this tool to open an artifact. When supplying IDs to show, they must be fully qualified like space:object.',
      // TODO(wittjosiah): Refactor Layout/Navigation/Deck actions so that they can be used directly.
      schema: S.Struct({
        id: S.String.annotations({
          description: 'The ID of the item to show.',
        }),
        pivotId: S.optional(
          S.String.annotations({
            description: 'The ID of the chat. If provided, the item will be added after the pivot item.',
          }),
        ),
      }),
      execute: async ({ id, pivotId }, { extensions }) => {
        invariant(extensions?.dispatch, 'No intent dispatcher');
        const { data, error } = await extensions.dispatch(
          createIntent(NavigationAction.AddToActive, {
            id,
            part: 'main',
            pivotId,
          }),
        );
        if (error) {
          return ToolResult.Error(error.message);
        }

        return ToolResult.Success(data);
      },
    }),
  ]);
