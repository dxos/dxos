//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppNode from '@dxos/app-toolkit/AppNode';
import * as AppNodeMatcher from '@dxos/app-toolkit/AppNodeMatcher';
import * as Operation from '@dxos/compute/Operation';
import { Obj } from '@dxos/echo';
import * as GraphNodeMatcher from '@dxos/graph/GraphNodeMatcher';
import * as AttentionCapabilities from '@dxos/plugin-attention/AttentionCapabilities';
import * as MarkdownCapabilities from '@dxos/plugin-markdown/MarkdownCapabilities';
import { Selection } from '@dxos/react-ui-attention/types';
import { Channel } from '@dxos/types';
import { createComment } from '@dxos/ui-editor/headless';
import { Position } from '@dxos/util';

import { meta } from '#meta';
import { CommentOperation } from '#types';

// Not the `../util` barrel: it re-exports `author-hue`, whose palette lookup is UI-only.
import { getAnchor } from '../util/message.ts';

/** Match ECHO objects that are NOT Channels (i.e. objects that can have comments). */
const whenCommentableObject = GraphNodeMatcher.whenAll(
  AppNodeMatcher.whenEchoObjectMatches,
  GraphNodeMatcher.whenNot(AppNodeMatcher.whenEchoTypeMatches(Channel.Channel)),
);

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilities = yield* Capability.Service;

    const getCommentConfig = (typename: string) =>
      capabilities.getAll(AppCapabilities.CommentConfig).find(({ id }) => id === typename);

    const getAnchorResolver = (typename: string) =>
      capabilities.getAll(AppCapabilities.AnchorResolver).find(({ key }) => key === typename);

    const extensions = yield* Effect.all([
      AppGraphBuilder.createExtension({
        id: 'commentsCompanion',
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
              variant: 'comments',
              label: ['comments.label', { ns: meta.profile.key }],
              icon: 'ph--chat-text--regular',
              data: 'comments',
              position: Position.first,
            }),
          ]),
      }),
      AppGraphBuilder.createExtension({
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
                // placeholder is not a cursor range the resolver could span.
                const selection = viewState.get(Selection.aspect, objectUri);
                const cursorAnchor = config.comments === 'anchored' ? getAnchor(selection) : undefined;
                yield* Operation.invoke(CommentOperation.Create, {
                  anchor: cursorAnchor ?? Date.now().toString(),
                  name:
                    cursorAnchor && typename ? getAnchorResolver(typename)?.getText(object, cursorAnchor) : undefined,
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

    return Capability.contribute(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
