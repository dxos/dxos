//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities, AppNode } from '@dxos/app-toolkit';
import { branchDiffAtom } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { getCurrentBranch } from '@dxos/echo-client';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { GraphBuilder, NodeMatcher } from '@dxos/plugin-graph';
import { linkedSegment, selectionAspect } from '@dxos/react-ui-attention';
import { Channel } from '@dxos/types';

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
        match: (node) => {
          if (!Obj.isObject(node.data) || Option.isNone(whenCommentableObject(node))) {
            return Option.none();
          }
          const commentConfig = getCommentConfig(Obj.getTypename(node.data)!);
          return commentConfig ? Option.some(node) : Option.none();
        },
        connector: () =>
          Effect.succeed([
            AppNode.makeCompanion({
              id: linkedSegment('comments'),
              label: ['comments.label', { ns: meta.id }],
              icon: 'ph--chat-text--regular',
              data: 'comments',
              position: 'first',
            }),
          ]),
      }),
      GraphBuilder.createExtension({
        id: 'commentToolbar',
        match: (node) => {
          if (!Obj.isObject(node.data) || Option.isNone(whenCommentableObject(node))) {
            return Option.none();
          }
          const commentConfig = getCommentConfig(Obj.getTypename(node.data)!);
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
                const config = getCommentConfig(Obj.getTypename(object)!)!;

                // Let the type create the comment with its own anchoring UI (e.g. an editor's
                // hunk/word snap), which branch-tags the thread itself. Type-agnostic: no plugin is
                // referenced here.
                if (config.createComment?.(object)) {
                  return;
                }

                // Generic fallback: anchor via the type's own selection (`getAnchor`) if it provides
                // one (e.g. a sheet's selected cells), else the attention selection, else an unanchored
                // thread. Branch-tag for review so the comment is scoped to the branch being compared,
                // else the branch in view. Only derive a label from a real cursor anchor.
                const cursorAnchor =
                  config.getAnchor?.(object) ??
                  (config.comments === 'anchored' ? getAnchor(viewState.get(selectionAspect, objectUri)) : undefined);
                const registry = capabilities.get(Capabilities.AtomRegistry);
                const activeBranch = registry.get(branchDiffAtom(object.id))?.compareTo ?? getCurrentBranch(object);
                // Invoke via the operation-invoker capability (carries the app runtime) rather than
                // the ambient `Operation.invoke` service: this action also runs from the sheet's menu
                // toolbar, whose runner does not provide the operation service.
                const { invokePromise } = capabilities.get(Capabilities.OperationInvoker);
                yield* Effect.promise(() =>
                  invokePromise(CommentOperation.Create, {
                    anchor: cursorAnchor ?? Date.now().toString(),
                    name: cursorAnchor ? config.getAnchorLabel?.(object, cursorAnchor) : undefined,
                    subject: object,
                    branch: activeBranch === 'main' ? undefined : activeBranch,
                  }),
                );
              }),
              properties: {
                label: ['add-comment.label', { ns: meta.id }],
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
