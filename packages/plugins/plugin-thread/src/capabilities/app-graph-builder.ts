//
// Copyright 2025 DXOS.org
//

import { Rx } from '@effect-rx/rx-react';
import { Option, pipe } from 'effect';

import { Capabilities, contributes, type PluginContext } from '@dxos/app-framework';
import { PLANK_COMPANION_TYPE, ATTENDABLE_PATH_SEPARATOR } from '@dxos/plugin-deck/types';
import { createExtension } from '@dxos/plugin-graph';

import { meta } from '../meta';

export default (context: PluginContext) =>
  contributes(Capabilities.AppGraphBuilder, [
    createExtension({
      id: `${meta.id}/comments`,
      connector: (node) =>
        Rx.make((get) =>
          pipe(
            get(node),
            Option.flatMap((node) =>
              // TODO(wittjosiah): Support comments on any object.
              !!node.data && typeof node.data === 'object' && 'threads' in node.data && Array.isArray(node)
                ? Option.some(node)
                : Option.none(),
            ),
            Option.map((node) => [
              {
                id: [node.id, 'comments'].join(ATTENDABLE_PATH_SEPARATOR),
                type: PLANK_COMPANION_TYPE,
                data: 'comments',
                properties: {
                  label: ['comments label', { ns: meta.id }],
                  icon: 'ph--chat-text--regular',
                  disposition: 'hidden',
                  position: 'hoist',
                },
              },
            ]),
            Option.getOrElse(() => []),
          ),
        ),
    }),
  ]);
