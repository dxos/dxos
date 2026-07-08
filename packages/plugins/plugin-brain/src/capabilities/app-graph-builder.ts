//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppNode } from '@dxos/app-toolkit';
import { Obj } from '@dxos/echo';
import { GraphBuilder } from '@dxos/plugin-graph';
import { linkedSegment } from '@dxos/react-ui-attention';

import { meta } from '#meta';

import { FACTS_NODE_DATA } from '../constants';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      // Facts companion: renders the space's semantic facts alongside any object article. `data` is a
      // sentinel (not the object) so the companion surface never collides with primary surfaces.
      GraphBuilder.createExtension({
        id: 'facts',
        match: (node) => (Obj.isObject(node.data) ? Option.some(node.data) : Option.none()),
        connector: () =>
          Effect.succeed([
            AppNode.makeCompanion({
              id: linkedSegment('facts'),
              label: ['facts-companion.label', { ns: meta.profile.key }],
              icon: 'ph--graph--regular',
              data: FACTS_NODE_DATA,
            }),
          ]),
      }),
    ]);

    return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
  }),
);
