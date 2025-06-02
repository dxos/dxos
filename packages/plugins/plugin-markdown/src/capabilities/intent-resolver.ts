//
// Copyright 2025 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { Match, Option, pipe, type Schema } from 'effect';

import {
  Capabilities,
  CollaborationActions,
  contributes,
  createResolver,
  type PluginContext,
} from '@dxos/app-framework';
import { createQueueDxn, isInstanceOf } from '@dxos/echo-schema';
import { makeRef, live, refFromDXN } from '@dxos/live-object';
import { createDocAccessor, fullyQualifiedId } from '@dxos/react-client/echo';
import { type EditorSelection } from '@dxos/react-ui-editor';
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
      resolve: async ({ target, object: objectRef, label }) => {
        const { editorState } = context.getCapability(MarkdownCapabilities.State);
        const text = await target.content.load();
        const accessor = createDocAccessor(text, ['content']);
        const { start, length } = pipe(
          editorState.getState(fullyQualifiedId(target))?.selection,
          Option.fromNullable,
          Option.getOrElse((): EditorSelection => ({ anchor: text.content.length - 1 })),
          selectionToRange,
        );
        accessor.handle.change((doc) => {
          const ref = `[${label ?? 'Generated content'}]](${objectRef.dxn.toString()})\n`;
          A.splice(doc, accessor.path.slice(), start, length, ref);
        });
      },
    }),
  ]);

// TODO(wittjosiah): Factor out.
const selectionToRange = Match.type<EditorSelection>().pipe(
  Match.when(
    ({ head, anchor }) => (head ? head > anchor : false),
    ({ head, anchor }) => ({ start: anchor, length: head! - anchor }),
  ),
  Match.when(
    ({ head, anchor }) => (head ? head < anchor : false),
    ({ head, anchor }) => ({ start: head!, length: anchor - head! }),
  ),
  Match.orElse(({ anchor }) => ({ start: anchor, length: 0 })),
);
