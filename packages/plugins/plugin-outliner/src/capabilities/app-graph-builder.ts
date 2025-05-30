//
// Copyright 2025 DXOS.org
//

import { Rx } from '@effect-rx/rx-react';
import { Option, pipe } from 'effect';

import { Capabilities, contributes, createIntent } from '@dxos/app-framework';
import { isInstanceOf } from '@dxos/echo-schema';
import { PLANK_COMPANION_TYPE, ATTENDABLE_PATH_SEPARATOR } from '@dxos/plugin-deck/types';
import { createExtension, rxFromSignal } from '@dxos/plugin-graph';
import { MeetingType } from '@dxos/plugin-meeting/types';
import { fullyQualifiedId } from '@dxos/react-client/echo';

import { OUTLINER_PLUGIN } from '../meta';
import { OutlinerAction, OutlineType } from '../types';

export default () =>
  contributes(Capabilities.AppGraphBuilder, [
    createExtension({
      id: `${OUTLINER_PLUGIN}/meeting-notes`,
      connector: (node) =>
        Rx.make((get) =>
          pipe(
            get(node),
            Option.flatMap((node) => (isInstanceOf(MeetingType, node.data) ? Option.some(node.data) : Option.none())),
            Option.map((meeting) => [
              {
                id: `${fullyQualifiedId(meeting)}${ATTENDABLE_PATH_SEPARATOR}${OutlineType.typename}`,
                type: PLANK_COMPANION_TYPE,
                data: get(rxFromSignal(() => meeting.artifacts?.[OutlineType.typename]?.target)),
                properties: {
                  label: ['meeting notes label', { ns: OUTLINER_PLUGIN }],
                  icon: 'ph--note--regular',
                  position: 'hoist',
                  disposition: 'hidden',
                  schema: OutlineType,
                  getIntent: () => createIntent(OutlinerAction.CreateOutline),
                },
              },
            ]),
            Option.getOrElse(() => []),
          ),
        ),
    }),
  ]);
