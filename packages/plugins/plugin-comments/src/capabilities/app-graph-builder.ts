//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppNode } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Obj } from '@dxos/echo';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { GraphBuilder, NodeMatcher } from '@dxos/plugin-graph';
import { type ViewStateManager, linkedSegment, selectionAspect } from '@dxos/react-ui-attention';
import { Channel } from '@dxos/types';
import { Position } from '@dxos/util';

import { meta } from '#meta';
import { CommentOperation } from '#types';
import { CommentCapabilities, type CommentState } from '#types';

import { getAnchor } from '../util';

type CommentDisabledParams = {
  stateAtom: Atom.Atom<Atom.Writable<CommentState>[]>;
  viewState: ViewStateManager;
  objectId: string;
  commentsType: string;
};

/**
 * Atom family to derive whether the comment button should be disabled.
 * Uses a composite key to ensure proper caching.
 */
const commentDisabledFamily = Atom.family(({ stateAtom, viewState, objectId, commentsType }: CommentDisabledParams) =>
  Atom.make((get) => {
    const stateAtoms = get(stateAtom);
    const state = stateAtoms[0] ? get(stateAtoms[0]) : undefined;
    const toolbar = state?.toolbar ?? {};
    const selection = get(viewState.atom(selectionAspect, objectId));
    const anchor = getAnchor(selection);
    const invalidSelection = !anchor;
    const overlappingComment = toolbar[objectId];
    return (commentsType === 'anchored' && invalidSelection) || overlappingComment;
  }),
);

/** Match ECHO objects that are NOT Channels (i.e. objects that can have comments). */
const whenCommentableObject = NodeMatcher.whenAll(
  NodeMatcher.whenEchoObjectMatches,
  NodeMatcher.whenNot(NodeMatcher.whenEchoTypeMatches(Channel.Channel)),
);

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // Read reactively so the extension establishes a dependency and heals once these
    // capabilities land (dependency modules contribute individually, not batched per wave).
    const commentConfigAtom = yield* Capability.atom(AppCapabilities.CommentConfig);
    const stateAtom = yield* Capability.atom(CommentCapabilities.State);
    const viewStateAtom = yield* Capability.atom(AttentionCapabilities.ViewState);

    const getCommentConfig = (get: Atom.Context, typename: string) =>
      get(commentConfigAtom).find(({ id }) => id === typename);

    const extensions = yield* Effect.all([
      GraphBuilder.createExtension({
        id: 'commentsCompanion',
        match: (node, get) => {
          if (!Obj.isObject(node.data) || Option.isNone(whenCommentableObject(node, get))) {
            return Option.none();
          }
          const commentConfig = getCommentConfig(get, Obj.getTypename(node.data)!);
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
          const commentConfig = getCommentConfig(get, Obj.getTypename(node.data)!);
          return commentConfig ? Option.some(node) : Option.none();
        },
        actions: (matched, get) => {
          const object = matched.data;
          const objectUri = Obj.getURI(object);
          const [viewState] = get(viewStateAtom);
          if (!viewState) {
            return Effect.succeed([]);
          }
          const commentConfig = getCommentConfig(get, Obj.getTypename(object)!)!;

          const disabled = get(
            commentDisabledFamily({
              stateAtom,
              viewState,
              objectId: objectUri,
              commentsType: commentConfig.comments,
            }),
          );

          return Effect.succeed([
            {
              id: 'comment',
              data: Effect.fnUntraced(function* () {
                const selection = viewState.get(selectionAspect, objectUri);
                const anchor =
                  (commentConfig.comments === 'anchored' ? getAnchor(selection) : undefined) ?? Date.now().toString();
                const name = commentConfig.getAnchorLabel?.(object, anchor);
                yield* Operation.invoke(CommentOperation.Create, {
                  anchor,
                  name,
                  subject: object,
                });
              }),
              properties: {
                label: ['add-comment.label', { ns: meta.profile.key }],
                icon: 'ph--chat-text--regular',
                disposition: 'toolbar',
                disabled,
                testId: 'comments.comment.add',
              },
            },
          ]);
        },
      }),
    ]);

    return [Capability.provide(AppCapabilities.AppGraphBuilder, extensions)];
  }),
);
