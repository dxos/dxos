//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capability, Common } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { Operation } from '@dxos/operation';
import { CreateAtom, GraphBuilder, NodeMatcher } from '@dxos/plugin-graph';
import { View } from '@dxos/schema';

import { meta } from '../../meta';
import { Map, MapAction } from '../../types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* GraphBuilder.createExtension({
      id: MapAction.MapOperation.Toggle.meta.key,
      match: (node) => Option.map(NodeMatcher.whenEchoType(View.View)(node), (view) => ({ view, node })),
      actions: ({ view, node }, get) => {
        const target = get(CreateAtom.fromSignal(() => (node.properties as any).presentation?.target));
        if (!Obj.instanceOf(Map.Map, target)) {
          return Effect.succeed([]);
        }
        return Effect.succeed([
          {
            id: `${view.id}/toggle-map`,
            data: () => Operation.invoke(MapAction.MapOperation.Toggle, undefined),
            properties: {
              label: ['toggle type label', { ns: meta.id }],
              icon: 'ph--compass--regular',
            },
          },
        ]);
      },
    });

    return Capability.contributes(Common.Capability.AppGraphBuilder, extensions);
  }),
);
