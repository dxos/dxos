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
      name: 'add_to_active',
      description: 'Add an item to the active parts of the layout.',
      schema: NavigationAction.AddToActive.fields.input,
      execute: async (props, { extensions }) => {
        invariant(extensions?.dispatch, 'No intent dispatcher');
        const { data, error } = await extensions.dispatch(createIntent(NavigationAction.AddToActive, props));
        if (!data || error) {
          return ToolResult.Error(error?.message ?? 'Failed to add item to active layout');
        }

        return ToolResult.Success(data);
      },
    }),
  ]);
