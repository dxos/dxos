//
// Copyright 2025 DXOS.org
//

import { Rx } from '@effect-rx/rx-react';
import * as Option from 'effect/Option';
import * as pipe from 'effect/pipe';

import { Capabilities, type PluginContext, contributes } from '@dxos/app-framework';
import { ROOT_ID, createExtension } from '@dxos/plugin-graph';

import { meta } from '../meta';

// NOTE: Copied from @dxos/plugin-deck to break circular dependency.
const ATTENDABLE_PATH_SEPARATOR = '~';

const DECK_COMPANION_TYPE = 'dxos.org/plugin/deck/deck-companion';

export default (_context: PluginContext) =>
  contributes(Capabilities.AppGraphBuilder, [
    createExtension({
      id: `${meta.id}/help`,
      connector: (node) =>
        Rx.make((get) =>
          pipe(
            get(node),
            Option.flatMap((node) => (node.id === ROOT_ID ? Option.some(node) : Option.none())),
            Option.map((node) => {
              return [
                {
                  id: [node.id, 'help'].join(ATTENDABLE_PATH_SEPARATOR),
                  type: DECK_COMPANION_TYPE,
                  data: null,
                  properties: {
                    label: ['help label', { ns: meta.id }],
                    icon: 'ph--question--regular',
                    disposition: 'hidden',
                    position: 'hoist',
                  },
                },
              ];
            }),
            Option.getOrElse(() => []),
          ),
        ),
    }),
  ]);
