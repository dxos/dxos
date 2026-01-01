//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common, OperationResolver } from '@dxos/app-framework';

import { Markdown, MarkdownCapabilities, MarkdownOperation } from '../../types';

export default Capability.makeModule((context) =>
  Effect.succeed(
    Capability.contributes(Common.Capability.OperationHandler, [
      OperationResolver.make({
        operation: MarkdownOperation.Create,
        handler: ({ name, content }) =>
          Effect.succeed({
            object: Markdown.make({ name, content }),
          }),
      }),
      OperationResolver.make({
        operation: MarkdownOperation.SetViewMode,
        handler: ({ id, viewMode }) =>
          Effect.sync(() => {
            const { state } = context.getCapability(MarkdownCapabilities.State);
            state.viewMode[id] = viewMode;
          }),
      }),
    ]),
  ),
);

