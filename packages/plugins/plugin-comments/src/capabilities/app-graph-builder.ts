//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppNode } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Obj } from '@dxos/echo';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { GraphBuilder, NodeMatcher } from '@dxos/plugin-graph';
import { MarkdownCapabilities } from '@dxos/plugin-markdown';
import { linkedSegment, selectionAspect } from '@dxos/react-ui-attention';
import { Channel } from '@dxos/types';
import { createComment } from '@dxos/ui-editor';
import { Position } from '@dxos/util';

import { meta } from '#meta';
import { CommentOperation } from '#types';

import { getAnchor } from '../util';

/** Match ECHO objects that are NOT Channels (i.e. objects that can have comments). */
const whenCommentableObject = NodeMatcher.whenAll(
  NodeMatcher.whenEchoObjectMatches,
  NodeMatcher.whenNot(NodeMatcher.whenEchoTypeMatches(Channel.Channel)),
);

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilities = yield* Capability.Service;

    const getCommentConfig = (typename: string) =>
      capabilities.getAll(AppCapabilities.CommentConfig).find(({ id }) => id === typename);

    const extensions = yield* Effect.all([
      GraphBuilder.createExtension({
        id: 'commentsCompanion',
        // No urlKey: companions are addressed through the reserved `companion/<variant>` grammar (the
        // `~<variant>` node segment), independent of any per-extension key.
        match: (node, get) => {
          if (!Obj.isObject(node.data) || Option.isNone(whenCommentableObject(node, get))) {
            return Option.none();
          }
          const typename = Obj.getTypename(node.data);
          const commentConfig = typename ? getCommentConfig(typename) : undefined;
          return commentConfig ? Option.some(node) : Option.none();
        },
        connector: () =>
          Effect.succeed([
            AppNode.makeCompanion({
              id: linkedSegment('comments'),
              label: ['comments.label', { ns: meta.profile.key }],
              icon: 'ph--chat-text--regular',
              data: 'comments',
              position: Position.first,
            }),
          ]),
      }),
      GraphBuilder.createExtension({
        id: 'commentToolbar',
        match: (node, get) => {
          if (!Obj.isObject(node.data) || Option.isNone(whenCommentableObject(node, get))) {
            return Option.none();
          }
          const typename = Obj.getTypename(node.data);
          const commentConfig = typename ? getCommentConfig(typename) : undefined;
          return commentConfig ? Option.some(node) : Option.none();
        },
        actions: (matched) => {
          const object = matched.data;
          const objectUri = Obj.getURI(object);
          const viewState = capabilities.get(AttentionCapabilities.ViewState);

          return Effect.succeed([
            {
              id: 'comment',
              data: Effect.fnUntraced(function* () {
                const typename = Obj.getTypename(object);
                const config = typename ? getCommentConfig(typename) : undefined;
                if (!config) {
                  return;
                }

                // Route editor-backed objects through the editor's create-comment command so the
                // anchor snaps to the largest logical region (the diff hunk under the cursor, else
                // the word) and the thread is branch-tagged by the editor's comment extension. The
                // view registry is keyed by attendable id, so look it up by document id (the object
                // URI) instead. Fall back to the raw selection for objects without a live editor.
                const view = capabilities.getAll(MarkdownCapabilities.EditorViews)[0]?.getByDocumentId(objectUri)?.view;
                if (view) {
                  createComment(view);
                  return;
                }

                // Fallback (non-editor objects): anchor to the current selection, or create an
                // unanchored thread. Only derive a label from a real cursor anchor — the unanchored
                // placeholder is not a cursor range and would throw in `getAnchorLabel`.
                const selection = viewState.get(selectionAspect, objectUri);
                const cursorAnchor = config.comments === 'anchored' ? getAnchor(selection) : undefined;
                yield* Operation.invoke(CommentOperation.Create, {
                  anchor: cursorAnchor ?? Date.now().toString(),
                  name: cursorAnchor ? config.getAnchorLabel?.(object, cursorAnchor) : undefined,
                  subject: object,
                });
              }),
              properties: {
                label: ['add-comment.label', { ns: meta.profile.key }],
                icon: 'ph--chat-text--regular',
                disposition: 'toolbar',
                // Always enabled: the create-comment command snaps to a sensible region, so a precise
                // selection is not required. (The toolbar is disabled wholesale in read-only mode.)
                disabled: false,
                testId: 'comments.comment.add',
              },
            },
          ]);
        },
      }),
    ]);

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
