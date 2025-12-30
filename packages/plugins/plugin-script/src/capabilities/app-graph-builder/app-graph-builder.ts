//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';
import { Script } from '@dxos/functions';
import { ATTENDABLE_PATH_SEPARATOR, PLANK_COMPANION_TYPE } from '@dxos/plugin-deck/types';
import { GraphBuilder } from '@dxos/plugin-graph';

import { meta } from '../../meta';

export default Capability.makeModule(() =>
  Effect.sync(() => {
    return Capability.contributes(Common.Capability.AppGraphBuilder, [
      GraphBuilder.createTypeExtension({
        id: `${meta.id}/execute`,
        type: Script.Script,
        connector: (script) => [
          {
            id: [script.id, 'execute'].join(ATTENDABLE_PATH_SEPARATOR),
            type: PLANK_COMPANION_TYPE,
            data: 'execute',
            properties: {
              label: ['script test label', { ns: meta.id }],
              icon: 'ph--terminal--regular',
              disposition: 'hidden',
            },
          },
        ],
      }),
      GraphBuilder.createTypeExtension({
        id: `${meta.id}/logs`,
        type: Script.Script,
        connector: (script) => [
          {
            id: [script.id, 'logs'].join(ATTENDABLE_PATH_SEPARATOR),
            type: PLANK_COMPANION_TYPE,
            data: 'logs',
            properties: {
              label: ['script logs label', { ns: meta.id }],
              icon: 'ph--clock-countdown--regular',
              disposition: 'hidden',
            },
          },
        ],
      }),
    ]);
  }),
);
