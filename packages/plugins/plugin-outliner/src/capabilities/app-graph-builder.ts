//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, createIntent } from '@dxos/app-framework';
import { getSchemaTypename, isInstanceOf } from '@dxos/echo-schema';
import { PLANK_COMPANION_TYPE, ATTENDABLE_PATH_SEPARATOR } from '@dxos/plugin-deck/types';
import { createExtension, type Node } from '@dxos/plugin-graph';
import { MeetingType } from '@dxos/plugin-meeting/types';
import { fullyQualifiedId } from '@dxos/react-client/echo';

import { OUTLINER_PLUGIN } from '../meta';
import { OutlinerAction, OutlineType } from '../types';

export default () =>
  contributes(Capabilities.AppGraphBuilder, [
    createExtension({
      id: `${OUTLINER_PLUGIN}/meeting-notes`,
      filter: (node): node is Node<MeetingType> =>
        isInstanceOf(MeetingType, node.data) && node.type !== PLANK_COMPANION_TYPE,
      connector: ({ node: { data: meeting } }) => [
        {
          id: `${fullyQualifiedId(meeting)}${ATTENDABLE_PATH_SEPARATOR}${getSchemaTypename(OutlineType)}`,
          type: PLANK_COMPANION_TYPE,
          data: meeting.artifacts[getSchemaTypename(OutlineType)!]?.target,
          properties: {
            label: ['meeting notes label', { ns: OUTLINER_PLUGIN }],
            icon: 'ph--note--regular',
            position: 'hoist',
            disposition: 'hidden',
            schema: OutlineType,
            getIntent: () => createIntent(OutlinerAction.CreateOutline),
          },
        },
      ],
    }),
  ]);
