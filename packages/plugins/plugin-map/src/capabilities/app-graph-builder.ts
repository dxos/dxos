//
// Copyright 2025 DXOS.org
//

import { Rx } from '@effect-rx/rx-react';
import { Option, pipe } from 'effect';

import { Capabilities, type PluginContext, contributes, createIntent } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { createExtension, rxFromSignal } from '@dxos/plugin-graph';
import { DataType } from '@dxos/schema';

import { meta } from '../meta';
import { Map, MapAction } from '../types';

export default (context: PluginContext) =>
  contributes(
    Capabilities.AppGraphBuilder,
    createExtension({
      id: MapAction.Toggle._tag,
      actions: (node) =>
        Rx.make((get) =>
          pipe(
            get(node),
            Option.flatMap((node) =>
              Obj.instanceOf(DataType.View, node.data) &&
              Obj.instanceOf(Map.Map, get(rxFromSignal(() => node.data.presentation.target)))
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
  );
