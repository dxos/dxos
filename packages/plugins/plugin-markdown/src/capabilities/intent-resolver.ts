//
// Copyright 2025 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { Option, pipe, type Schema } from 'effect';

import {
  Capabilities,
  CollaborationActions,
  contributes,
  createResolver,
  type PluginContext,
} from '@dxos/app-framework';
import { createQueueDxn, isInstanceOf } from '@dxos/echo-schema';
import { makeRef, live, refFromDXN } from '@dxos/live-object';
import { createDocAccessor, getRangeFromCursor } from '@dxos/react-client/echo';
import { DataType } from '@dxos/schema';

import { MarkdownCapabilities } from './capabilities';
import { DocumentType, MarkdownAction } from '../types';

export default (context: PluginContext) =>
  contributes(Capabilities.IntentResolver, [
    createResolver({
      intent: MarkdownAction.Create,
      resolve: ({ name, spaceId, content }) => {
        const doc = live(DocumentType, {
          name,
          content: makeRef(live(DataType.Text, { content: content ?? '' })),
          assistantChatQueue: refFromDXN(createQueueDxn(spaceId)),
          threads: [],
        });

        return { data: { object: doc } };
      },
    }),
    createResolver({
      intent: MarkdownAction.SetViewMode,
      resolve: ({ id, viewMode }) => {
        const { state } = context.getCapability(MarkdownCapabilities.State);
        state.viewMode[id] = viewMode;
      },
    }),
    createResolver({
      intent: CollaborationActions.InsertContent,
      filter: (
        data,
      ): data is Omit<Schema.Schema.Type<typeof CollaborationActions.InsertContent.fields.input>, 'target'> & {
        target: DocumentType;
      } => isInstanceOf(DocumentType, data.target),
      resolve: async ({ target, object: objectRef, at, label }) => {
        const text = await target.content.load();
        const accessor = createDocAccessor(text, ['content']);
        const { start, end } = pipe(
          Option.fromNullable(at),
          Option.flatMap((at) => Option.fromNullable(getRangeFromCursor(accessor, at))),
          Option.getOrElse(() => ({ start: text.content.length - 1, end: text.content.length - 1 })),
        );
        accessor.handle.change((doc) => {
          const ref = `[${label ?? 'Generated content'}]](${objectRef.dxn.toString()})\n`;
          A.splice(doc, accessor.path.slice(), start, end - start, ref);
        });
      },
    }),
  ]);
