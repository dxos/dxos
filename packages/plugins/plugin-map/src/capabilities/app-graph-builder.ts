//
// Copyright 2025 DXOS.org
//

import { Rx } from '@effect-rx/rx-react';
import { Option, pipe } from 'effect';

import { Capabilities, contributes, createIntent, type PluginContext } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { createExtension } from '@dxos/plugin-graph';

import { MAP_PLUGIN } from '../meta';
import { MapType, MapAction } from '../types';

export default (context: PluginContext) =>
  contributes(
    Capabilities.AppGraphBuilder,
    createExtension({
      id: MapAction.Toggle._tag,
      actions: (node) =>
        Rx.make((get) =>
          pipe(
            get(node),
            Option.flatMap((node) => (Obj.instanceOf(MapType, node.data) ? Option.some(node) : Option.none())),
            Option.map(() => [
              {
                id: `${MAP_PLUGIN}/toggle`,
                data: async () => {
                  const { dispatchPromise: dispatch } = context.getCapability(Capabilities.IntentDispatcher);
                  await dispatch(createIntent(MapAction.Toggle));
                },
                properties: {
                  label: ['toggle type label', { ns: MAP_PLUGIN }],
                  icon: 'ph--compass--regular',
                },
              },
            ]),
            Option.getOrElse(() => []),
          ),
        ),
    }),
  );
