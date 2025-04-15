//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, createIntent } from '@dxos/app-framework';
import { COMPANION_TYPE } from '@dxos/plugin-deck/types';
import { createExtension, type Node } from '@dxos/plugin-graph';
import { MeetingType } from '@dxos/plugin-meeting/types';
import { fullyQualifiedId } from '@dxos/react-client/echo';

import { OUTLINER_PLUGIN } from '../meta';
import { OutlinerAction, OutlineType } from '../types';

export default () =>
  contributes(Capabilities.AppGraphBuilder, [
    createExtension({
      id: `${OUTLINER_PLUGIN}/meeting-notes`,
      filter: (node): node is Node<MeetingType> => node.data instanceof MeetingType,
      connector: ({ node }) => [
        {
          id: `${fullyQualifiedId(node.data)}/companion/notes`,
          type: COMPANION_TYPE,
          data: node.id,
          properties: {
            label: ['meeting notes label', { ns: OUTLINER_PLUGIN }],
            icon: 'ph--note--regular',
            position: 'hoist',
            schema: OutlineType,
            getIntent: () => createIntent(OutlinerAction.CreateOutline),
          },
        },
      ],
    }),
  ]);
