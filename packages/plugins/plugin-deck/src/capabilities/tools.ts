//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { createTool, ToolResult } from '@dxos/ai';
import {
  contributes,
  createIntent,
  Capabilities,
  LayoutAction,
  type PromiseIntentDispatcher,
} from '@dxos/app-framework';
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
    createTool(meta.id, {
      name: 'show',
      description: `
        Show an item as a companion to an existing plank. This will make the item appear alongside the primary content.
        When supplying IDs, they must be fully qualified like space:object.
      `,
      caption: 'Showing item...',
      // TODO(wittjosiah): Refactor Layout/Navigation/Deck actions so that they can be used directly.
      schema: Schema.Struct({
        id: Schema.String.annotations({
          description: 'The ID of the item to show.',
        }),
      }),
      execute: async ({ id }, { extensions }) => {
        invariant(extensions);
        const { pivotId, dispatch, part } = extensions;
        invariant(pivotId, 'No pivot ID');
        invariant(dispatch, 'No intent dispatcher');

        if (part === 'deck') {
          const { data, error } = await dispatch(
            createIntent(DeckAction.ChangeCompanion, {
              primary: pivotId,
              companion: id,
            }),
          );
          if (error) {
            return ToolResult.Error(error.message);
          }

          return ToolResult.Success(data);
        } else {
          const { data, error } = await dispatch(
            createIntent(LayoutAction.Open, {
              subject: [id],
              part: 'main',
              options: {
                pivotId,
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
