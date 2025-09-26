//
// Copyright 2025 DXOS.org
//

import { Rx } from '@effect-rx/rx-react';
import { Option, pipe } from 'effect';

import { Capabilities, type PluginContext, contributes, createIntent } from '@dxos/app-framework';
import { ClientCapabilities } from '@dxos/plugin-client';
import { ATTENDABLE_PATH_SEPARATOR, DECK_COMPANION_TYPE } from '@dxos/plugin-deck/types';
import { ROOT_ID, createExtension, rxFromSignal } from '@dxos/plugin-graph';
import { parseId } from '@dxos/react-client/echo';

import { meta } from '../meta';
import { SearchAction } from '../types';

export default (context: PluginContext) =>
  contributes(Capabilities.AppGraphBuilder, [
    createExtension({
      id: `${meta.id}/space-search`,
      connector: (node) =>
        Rx.make((get) =>
          pipe(
            get(node),
            Option.flatMap((node) => (node.id === ROOT_ID ? Option.some(node) : Option.none())),
            Option.map((node) => {
              const workspace = get(rxFromSignal(() => context.getCapability(Capabilities.Layout).workspace));
              const client = context.getCapability(ClientCapabilities.Client);
              const { spaceId } = parseId(workspace);
              const space = spaceId ? client.spaces.get(spaceId) : null;

              return [
                {
                  id: [node.id, 'search'].join(ATTENDABLE_PATH_SEPARATOR),
                  type: DECK_COMPANION_TYPE,
                  data: space,
                  properties: {
                    label: ['search label', { ns: meta.id }],
                    icon: 'ph--magnifying-glass--regular',
                    disposition: 'hidden',
                  },
                },
              ];
            }),
            Option.getOrElse(() => []),
          ),
        ),
    }),
    createExtension({
      id: meta.id,
      actions: (node) =>
        Rx.make((get) =>
          pipe(
            get(node),
            Option.flatMap((node) => (node.id === ROOT_ID ? Option.some(node) : Option.none())),
            Option.map(() => {
              return [
                {
                  id: SearchAction.OpenSearch._tag,
                  data: async () => {
                    const { dispatchPromise: dispatch } = context.getCapability(Capabilities.IntentDispatcher);
                    await dispatch(createIntent(SearchAction.OpenSearch));
                  },
                  properties: {
                    label: ['search action label', { ns: meta.id }],
                    icon: 'ph--magnifying-glass--regular',
                    keyBinding: {
                      macos: 'shift+meta+f',
                      windows: 'shift+alt+f',
                    },
                  },
                },
              ];
            }),
            Option.getOrElse(() => []),
          ),
        ),
    }),
  ]);
