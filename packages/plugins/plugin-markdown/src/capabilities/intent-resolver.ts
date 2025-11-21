//
// Copyright 2025 DXOS.org
//

import { next as A } from '@automerge/automerge';
import * as Option from 'effect/Option';
import type * as Schema from 'effect/Schema';

import {
  Capabilities,
  CollaborationActions,
  type PluginContext,
  contributes,
  createResolver,
} from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { createDocAccessor, getRangeFromCursor } from '@dxos/echo-db';

import { Markdown, MarkdownAction } from '../types';

import { MarkdownCapabilities } from './capabilities';

export default (context: PluginContext) =>
  contributes(Capabilities.IntentResolver, [
    createResolver({
      intent: MarkdownAction.Create,
      resolve: ({ name, content }) => {
        return { data: { object: Markdown.make({ name, content }) } };
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
      intent: CollaborationActions.AcceptProposal,
      filter: (
        data,
      ): data is Omit<Schema.Schema.Type<typeof CollaborationActions.AcceptProposal.fields.input>, 'subject'> & {
        subject: Markdown.Document;
      } => Obj.instanceOf(Markdown.Document, data.subject),
      resolve: async ({ subject, anchor, proposal }) => {
        const text = await subject.content.load();
        const accessor = createDocAccessor(text, ['content']);
        const { start, end } = Option.fromNullable(anchor).pipe(
          Option.flatMap((at) => Option.fromNullable(getRangeFromCursor(accessor, at))),
          // Fallback to the end of the document.
          Option.getOrElse(() => ({ start: text.content.length - 1, end: text.content.length - 1 })),
        );
        accessor.handle.change((doc) => {
          A.splice(doc, accessor.path.slice(), start, end - start, proposal.text);
        });
      },
    }),
  ]);
