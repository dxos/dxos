//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';
import { OperationResolver } from '@dxos/operation';

import { Markdown, MarkdownCapabilities, MarkdownOperation } from '../../types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const context = yield* Capability.PluginContextService;

    return Capability.contributes(Common.Capability.OperationResolver, [
      OperationResolver.make({
        operation: MarkdownOperation.Create,
        handler: ({ name, content }) =>
          Effect.succeed({
            object: Markdown.make({ name, content }),
          }),
      }),
      // TODO(wittjosiah): This appears to be unused.
      OperationResolver.make({
        operation: MarkdownOperation.SetViewMode,
        handler: ({ id, viewMode }) =>
          Effect.sync(() => {
            const { state } = context.getCapability(MarkdownCapabilities.State);
            state.viewMode[id] = viewMode;
          }),
      }),
    ]);
  }),
);
