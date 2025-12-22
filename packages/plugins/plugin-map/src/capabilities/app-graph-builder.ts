//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';

import { Capabilities, type PluginContext, contributes, createIntent, defineCapabilityModule } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { atomFromSignal, createExtension } from '@dxos/plugin-graph';
import { View } from '@dxos/schema';

import { meta } from '../meta';
import { Map, MapAction } from '../types';

export default defineCapabilityModule((context: PluginContext) =>
  contributes(
    Capabilities.AppGraphBuilder,
    createExtension({
      id: MapAction.Toggle._tag,
      actions: (node) =>
        Atom.make((get) =>
          Function.pipe(
            get(node),
            Option.flatMap((node) =>
              Obj.instanceOf(View.View, node.data) &&
              Obj.instanceOf(Map.Map, get(atomFromSignal(() => node.data.presentation.target)))
                ? Option.some(node)
                : Option.none(),
            ),
            Option.map((node) => [
              {
                id: `${node.id}/toggle-map`,
                data: async () => {
                  const { dispatchPromise: dispatch } = context.getCapability(Capabilities.IntentDispatcher);
                  await dispatch(createIntent(MapAction.Toggle));
                },
                properties: {
                  label: ['toggle type label', { ns: meta.id }],
                  icon: 'ph--compass--regular',
                },
              },
            ]),
            Option.getOrElse(() => []),
          ),
        ),
    }),
  ));
