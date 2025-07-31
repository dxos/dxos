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
import { Obj } from '@dxos/echo';
import { createDocAccessor, getRangeFromCursor, Ref } from '@dxos/react-client/echo';
import { DataType } from '@dxos/schema';

import { MarkdownCapabilities } from './capabilities';
import { Markdown, MarkdownAction } from '../types';

export default (context: PluginContext) =>
  contributes(Capabilities.IntentResolver, [
    createResolver({
      intent: MarkdownAction.Create,
      resolve: ({ name, content }) => {
        const doc = Obj.make(Markdown.Document, {
          name,
          content: Ref.make(Obj.make(DataType.Text, { content: content ?? '' })),
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
        target: Markdown.Document;
      } => Obj.instanceOf(Markdown.Document, data.target),
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
