//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppNode from '@dxos/app-toolkit/AppNode';
import * as GraphNodeMatcher from '@dxos/graph/GraphNodeMatcher';
import { Position } from '@dxos/util';

import { meta } from '#meta';
import { CallsCapabilities } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // Read reactively so the extension establishes a dependency and heals once this
    // capability lands (dependency modules contribute individually, not batched per wave).
    const callManagerAtom = yield* Capability.atom(CallsCapabilities.Manager);

    const extensions = yield* Effect.all([
      AppGraphBuilder.createExtension({
        id: 'activeCall',
        match: GraphNodeMatcher.whenRoot,
        connector: (node, get) => {
          const [call] = get(callManagerAtom);
          if (!call) {
            return Effect.succeed([]);
          }
          const joined = get(call.joinedAtom);
          return Effect.succeed(
            joined
              ? [
                  AppNode.makeDeckCompanion({
                    id: 'activeCall',
                    label: ['call-panel.label', { ns: meta.profile.key }],
                    icon: 'ph--video-conference--regular',
                    data: null,
                    position: Position.first,
                  }),
                ]
              : [],
          );
        },
      }),
    ]);

    return Capability.contribute(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
