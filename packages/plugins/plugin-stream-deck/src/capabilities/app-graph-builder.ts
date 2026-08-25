//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as GraphBuilder from '@dxos/app-graph/GraphBuilder';
import * as NodeMatcher from '@dxos/app-graph/NodeMatcher';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppNode from '@dxos/app-toolkit/AppNode';
import { Position } from '@dxos/util';

import { meta } from '#meta';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      GraphBuilder.createExtension({
        id: 'deckCompanion',
        match: NodeMatcher.whenRoot,
        connector: () =>
          Effect.succeed([
            AppNode.makeDeckCompanion({
              id: 'streamDeck',
              label: ['deck-companion.label', { ns: meta.profile.key }],
              icon: 'ph--squares-four--regular',
              data: 'stream-deck' as const,
              position: Position.last,
            }),
          ]),
      }),
    ]);

    return Capability.contribute(AppCapabilities.AppGraphBuilder, extensions.flat());
  }),
);
