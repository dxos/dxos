//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';

import {
  Capabilities,
  type PluginContext,
  contributes,
  createIntent,
  defineCapabilityModule,
} from '@dxos/app-framework';
import { ClientCapabilities } from '@dxos/plugin-client';
import { ATTENDABLE_PATH_SEPARATOR, DECK_COMPANION_TYPE } from '@dxos/plugin-deck/types';
import { CreateAtom, Graph, GraphBuilder } from '@dxos/plugin-graph';
import { parseId } from '@dxos/react-client/echo';

import { meta } from '../meta';
import { SearchAction } from '../types';

export default defineCapabilityModule((context: PluginContext) =>
  contributes(Capabilities.AppGraphBuilder, [
    GraphBuilder.createExtension({
      id: `${meta.id}/space-search`,
      connector: (node) =>
        Atom.make((get) =>
          Function.pipe(
            get(node),
            Option.flatMap((node) => (node.id === Graph.ROOT_ID ? Option.some(node) : Option.none())),
            Option.map((node) => {
              const workspace = get(
                CreateAtom.fromSignal(() => context.getCapability(Capabilities.Layout).workspace),
              );
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
    GraphBuilder.createExtension({
      id: meta.id,
      actions: (node) =>
        Atom.make((get) =>
          Function.pipe(
            get(node),
            Option.flatMap((node) => (node.id === Graph.ROOT_ID ? Option.some(node) : Option.none())),
            Option.map(() => {
              return [
                {
                  id: SearchAction.OpenSearch._tag,
                  data: async () => {
                    const { dispatchPromise: dispatch } = context.getCapability(Capabilities.IntentDispatcher);
                    await dispatch(createIntent(SearchAction.OpenSearch));
                    return false;
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
  ]),
);
