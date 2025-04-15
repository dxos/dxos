//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, createIntent, type PluginsContext } from '@dxos/app-framework';
import { COMPANION_TYPE } from '@dxos/plugin-deck/types';
import { createExtension, type Node } from '@dxos/plugin-graph';
import { DocumentType } from '@dxos/plugin-markdown/types';
import { memoizeQuery } from '@dxos/plugin-space';
import { Filter, type Space, fullyQualifiedId, isSpace } from '@dxos/react-client/echo';

import { MEETING_PLUGIN } from '../meta';
import { MeetingAction, MeetingType } from '../types';

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

    createExtension({
      id: `${MEETING_PLUGIN}/meeting-summary`,
      filter: (node): node is Node<MeetingType> => node.data instanceof MeetingType,
      // TODO(wittjosiah): Only show the summarize action if the meeting plausibly completed.
      actions: ({ node }) => [
        {
          id: `${fullyQualifiedId(node.data)}/action/summarize`,
          data: async () => {
            const { dispatchPromise: dispatch } = context.requestCapability(Capabilities.IntentDispatcher);
            await dispatch(createIntent(MeetingAction.Summarize, { meeting: node.data }));
          },
          properties: {
            label: ['summarize label', { ns: MEETING_PLUGIN }],
            icon: 'ph--book-open-text--regular',
          },
        },
      ],
      // TODO(wittjosiah): Only show the summary companion if the meeting plausibly completed.
      connector: ({ node }) => [
        {
          id: `${fullyQualifiedId(node.data)}/companion/summary`,
          type: COMPANION_TYPE,
          data: node.id,
          properties: {
            label: ['meeting summary label', { ns: MEETING_PLUGIN }],
            icon: 'ph--book-open-text--regular',
            position: 'fallback',
            schema: DocumentType,
            getIntent: ({ meeting }: { meeting: MeetingType }) => createIntent(MeetingAction.Summarize, { meeting }),
          },
        },
      ],
    }),
  ]);
