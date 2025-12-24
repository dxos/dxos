//
// Copyright 2025 DXOS.org
//

// ISSUE(burdon): tools
// @ts-nocheck

import * as Schema from 'effect/Schema';

import {
  Capabilities,
  LayoutAction,
  type PromiseIntentDispatcher,
  contributes,
  createIntent,
  defineCapabilityModule,
} from '@dxos/app-framework';
import { invariant } from '@dxos/invariant';
import { trim } from '@dxos/util';

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

export default defineCapabilityModule(() =>
  contributes(Capabilities.Tools, [
    createTool(meta.id, {
      name: 'show',
      description: trim`
        Show an item as a companion to an existing plank. 
        When supplying IDs, they must be fully qualified like this: space-key:object-id
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
  ]),
);
