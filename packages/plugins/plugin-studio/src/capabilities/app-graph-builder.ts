//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppNode from '@dxos/app-toolkit/AppNode';
import { Obj } from '@dxos/echo';
import { isNonNullable } from '@dxos/util';

import { Frame, MediaArtifact, Storyboard } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // A storyboard's frames' artifacts as its child nodes (the frames themselves stay hidden — a frame
    // is a row of the storyboard, not a destination). Gives each nested artifact article a node of its
    // own under the storyboard, which is where its toolbar reads contributed actions.
    const extensions = yield* Effect.all([
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
              .map((artifact) => AppNode.makeObject({ get, db, object: artifact, navigable: true }))
              .filter(isNonNullable),
          );
        },
      }),
    ]);

    return Capability.contribute(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
