//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppNode from '@dxos/app-toolkit/AppNode';
import { Obj } from '@dxos/echo';
import * as AttentionCapabilities from '@dxos/plugin-attention/AttentionCapabilities';
import { isNonNullable } from '@dxos/util';

import { meta } from '#meta';
import { Frame, MediaArtifact, Storyboard, StoryboardView } from '#types';

import { FRAME_COMPANION } from '../constants.ts';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // A storyboard's frames' artifacts as hidden child nodes: a frame is a row of the storyboard, not
    // a destination, so nothing is listed in the navtree — but each nested artifact article still
    // needs a node of its own under the storyboard, which is where its toolbar reads contributed
    // actions (Connect). Hidden rather than navigable: these nodes have no URL of their own.
    const extensions = yield* Effect.all([
      // Play: the storyboard's main-panel toolbar reads it as a graph action, so no host threads a
      // callback down; the article watches the view state the action flips.
      AppGraphBuilder.createTypeExtension({
        id: 'storyboardPlay',
        type: Storyboard.Storyboard,
        actions: (storyboard, get) =>
          Effect.succeed([
            AppGraphNode.makeAction({
              id: `${meta.profile.key}.play`,
              data: () =>
                Effect.gen(function* () {
                  const viewState = yield* Capability.get(AttentionCapabilities.ViewState);
                  viewState.set(StoryboardView.aspect, storyboard.id, { playing: true });
                }),
              properties: {
                label: ['play.label', { ns: meta.profile.key }],
                icon: 'ph--play--regular',
                disposition: 'toolbar',
                disabled: get(StoryboardView.clipsAtom(storyboard)).length === 0,
                testId: 'studioPlugin.play',
              },
            }),
          ]),
      }),
      // The frame companion: the selected frame's artifact article beside the storyboard plank.
      AppGraphBuilder.createTypeExtension({
        id: 'frameCompanion',
        relation: AppNode.companion,
        type: Storyboard.Storyboard,
        connector: () =>
          Effect.succeed([
            AppNode.makeCompanion({
              variant: FRAME_COMPANION,
              label: ['frame-companion.label', { ns: meta.profile.key }],
              icon: 'ph--frame-corners--regular',
              data: FRAME_COMPANION,
            }),
          ]),
      }),
      AppGraphBuilder.createExtension({
        id: 'storyboardArtifacts',
        match: (node) => (Obj.instanceOf(Storyboard.Storyboard, node.data) ? Option.some(node.data) : Option.none()),
        connector: (storyboard, get) => {
          const db = Obj.getDatabase(storyboard);
          if (!db) {
            return Effect.succeed([]);
          }
          // Subscribe to the storyboard itself: the children are its ref array.
          const { frames } = get(Obj.atom(storyboard));
          const artifacts = frames
            .map((ref) => get(Obj.atomReactive(ref)))
            .filter((frame): frame is Frame.Frame => !!frame && Obj.instanceOf(Frame.Frame, frame))
            .map((frame) => (frame.artifact ? get(Obj.atomReactive(frame.artifact)) : undefined))
            .filter(
              (artifact): artifact is MediaArtifact.MediaArtifact =>
                !!artifact && Obj.instanceOf(MediaArtifact.MediaArtifact, artifact),
            );
          return Effect.succeed(
            artifacts
              .map((artifact) => AppNode.makeObject({ get, db, object: artifact, disposition: 'hidden' }))
              .filter(isNonNullable),
          );
        },
      }),
    ]);

    return Capability.contribute(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
