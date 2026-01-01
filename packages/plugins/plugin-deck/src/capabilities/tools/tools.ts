//
// Copyright 2025 DXOS.org
//

// ISSUE(burdon): tools
// @ts-nocheck

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import {
  Capabilities,
  Capability,
  LayoutAction,
  type PromiseIntentDispatcher,
  createIntent,
} from '@dxos/app-framework';
import { type OperationInvoker } from '@dxos/app-framework/plugin-operation/invoker';
import { invariant } from '@dxos/invariant';
import { trim } from '@dxos/util';

import { meta } from '../../meta';
import { DeckOperation } from '../../types';

// TODO(burdon): Factor out.
declare global {
  interface ToolContextExtensions {
    dispatch?: PromiseIntentDispatcher;
    pivotId?: string;
    part?: 'deck' | 'dialog';
  }
}

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.Tools, [
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
          const { pivotId, dispatch, invokePromise, part } = extensions as {
            pivotId: string;
            dispatch: PromiseIntentDispatcher;
            invokePromise: OperationInvoker['invokePromise'];
            part: string;
          };
          invariant(pivotId, 'No pivot ID');
          invariant(invokePromise, 'No operation invoker');

          if (part === 'deck') {
            const { error } = await invokePromise(DeckOperation.ChangeCompanion, {
              primary: pivotId,
              companion: id,
            });
            if (error) {
              return ToolResult.Error(error.message);
            }

            return ToolResult.Success({});
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
  ),
);
