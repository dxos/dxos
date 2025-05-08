//
// Copyright 2025 DXOS.org
//

import {
  contributes,
  createIntent,
  Capabilities,
  LayoutAction,
  type PromiseIntentDispatcher,
} from '@dxos/app-framework';
import { defineTool, ToolResult } from '@dxos/artifact';
import { S } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';

import { meta } from '../meta';
import { DeckAction } from '../types';

// TODO(burdon): Factor out.
declare global {
  interface ToolContextExtensions {
    dispatch?: PromiseIntentDispatcher;
    pivotId?: string;
    part?: 'deck' | 'dialog';
  }
}

export default () =>
  contributes(Capabilities.Tools, [
    defineTool(meta.id, {
      name: 'show',
      description: `
        Show an item as a companion to an existing plank. This will make the item appear alongside the primary content.
        When supplying IDs, they must be fully qualified like space:object.
      `,
      caption: 'Showing item...',
      // TODO(wittjosiah): Refactor Layout/Navigation/Deck actions so that they can be used directly.
      schema: S.Struct({
        id: S.String.annotations({
          description: 'The ID of the item to show.',
        }),
      }),
      execute: async ({ id }, { extensions }) => {
        invariant(extensions?.pivotId, 'No pivot ID');
        invariant(extensions?.dispatch, 'No intent dispatcher');

        if (extensions.part === 'deck') {
          const { data, error } = await extensions.dispatch(
            createIntent(DeckAction.ChangeCompanion, {
              primary: extensions.pivotId,
              companion: id,
            }),
          );
          if (error) {
            return ToolResult.Error(error.message);
          }

          return ToolResult.Success(data);
        } else {
          const { data, error } = await extensions.dispatch(
            createIntent(LayoutAction.Open, {
              subject: [id],
              part: 'main',
              options: {
                pivotId: extensions.pivotId,
                positioning: 'end',
              },
            }),
          );
          if (error) {
            return ToolResult.Error(error.message);
          }

          return ToolResult.Success(data);
        }
      },
    }),
  ]);
