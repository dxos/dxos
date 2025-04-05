//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, type PluginsContext } from '@dxos/app-framework';
import { createExtension, type Node } from '@dxos/plugin-graph';
import { memoizeQuery } from '@dxos/plugin-space';
import { Filter, type Space, fullyQualifiedId, isSpace } from '@dxos/react-client/echo';

import { MEETING_PLUGIN } from '../meta';
import { MeetingType } from '../types';

export default (context: PluginsContext) =>
  contributes(Capabilities.AppGraphBuilder, [
    createExtension({
      id: `${MEETING_PLUGIN}/root`,
      filter: (node): node is Node<Space> => isSpace(node.data),
      connector: ({ node }) => {
        const meetings = memoizeQuery(node.data, Filter.schema(MeetingType));
        return meetings.length > 0
          ? [
              {
                id: `${MEETING_PLUGIN}/meetings`,
                type: `${MEETING_PLUGIN}/meetings`,
                data: null,
                properties: {
                  label: ['meetings label', { ns: MEETING_PLUGIN }],
                  icon: 'ph--phone-list--regular',
                  space: node.data,
                },
              },
            ]
          : [];
      },
    }),

    // TODO(wittjosiah): Show presence dots for meetings based on active participants in the call.
    // TODO(wittjosiah): Highlight active meetings in L1.
    //  Separate section for active meetings, with different icons & labels.
    //  Track active meetings by subscribing to meetings query and polling the swarms of recent meetings in the space.
    createExtension({
      id: `${MEETING_PLUGIN}/meetings`,
      filter: (node): node is Node<null, { space: Space }> => node.id === `${MEETING_PLUGIN}/meetings`,
      connector: ({ node }) => {
        const { metadata } = context.requestCapability(
          Capabilities.Metadata,
          (capability): capability is { id: string; metadata: { label: (object: any) => string; icon: string } } =>
            capability.id === MeetingType.typename,
        );
        const meetings = memoizeQuery(node.properties.space, Filter.schema(MeetingType));
        return meetings
          .toSorted((a, b) => {
            const nameA = a.name ?? '';
            const nameB = b.name ?? '';
            return nameA.localeCompare(nameB);
          })
          .map((meeting) => ({
            id: fullyQualifiedId(meeting),
            type: `${MEETING_PLUGIN}/meeting`,
            data: meeting,
            properties: {
              label: metadata.label(meeting) ?? ['meeting label', { ns: MEETING_PLUGIN }],
              icon: metadata.icon,
            },
          }));
      },
    }),
  ]);
