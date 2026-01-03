//
// Copyright 2025 DXOS.org
//

import * as Option from 'effect/Option';

import {
  Capabilities,
  type PluginContext,
  contributes,
  createIntent,
  defineCapabilityModule,
} from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { CreateAtom, GraphBuilder } from '@dxos/plugin-graph';
import { View } from '@dxos/schema';

import { meta } from '../meta';
import { Map, MapAction } from '../types';

export default defineCapabilityModule((context: PluginContext) => {
  return contributes(
    Capabilities.AppGraphBuilder,
    GraphBuilder.createExtension({
      id: MapAction.Toggle._tag,
      match: (node) => {
        if (!Obj.instanceOf(View.View, node.data)) {
          return Option.none();
        }
        return Option.some({ view: node.data, node });
      },
      actions: ({ view, node }, get) => {
        const target = get(CreateAtom.fromSignal(() => (node.properties as any).presentation?.target));
        if (!Obj.instanceOf(Map.Map, target)) {
          return [];
        }
        return [
          {
            id: `${view.id}/toggle-map`,
            data: async () => {
              const { dispatchPromise: dispatch } = context.getCapability(Capabilities.IntentDispatcher);
              await dispatch(createIntent(MapAction.Toggle));
            },
            properties: {
              label: ['toggle type label', { ns: meta.id }],
              icon: 'ph--compass--regular',
            },
          },
        ];
      },
    }),
  );
});
