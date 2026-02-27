//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Obj, Ref, Type } from '@dxos/echo';
import { OperationResolver } from '@dxos/operation';
import { Collection } from '@dxos/schema';

import { Markdown, MarkdownCapabilities, MarkdownOperation } from '../../types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(Capabilities.OperationResolver, [
      OperationResolver.make({
        operation: MarkdownOperation.OnCreateSpace,
        handler: Effect.fnUntraced(function* ({ rootCollection }) {
          const collection = Collection.makeManaged({ key: Type.getTypename(Markdown.Document) });
          Obj.change(rootCollection, (c) => {
            c.objects.push(Ref.make(collection));
          });
        }),
      }),
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
        handler: Effect.fnUntraced(function* ({ id, viewMode }) {
          yield* Capabilities.updateAtomValue(MarkdownCapabilities.State, (current) => ({
            ...current,
            viewMode: { ...current.viewMode, [id]: viewMode },
          }));
        }),
      }),
    ]);
  }),
);
