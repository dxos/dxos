//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, createIntent, type PluginsContext } from '@dxos/app-framework';
import { isInstanceOf } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { PLANK_COMPANION_TYPE, ATTENDABLE_PATH_SEPARATOR, DECK_COMPANION_TYPE } from '@dxos/plugin-deck/types';
import { createExtension, type Node } from '@dxos/plugin-graph';
import { DocumentType } from '@dxos/plugin-markdown/types';
import { COMPOSER_SPACE_LOCK, memoizeQuery } from '@dxos/plugin-space';
import { SPACE_TYPE, SpaceAction } from '@dxos/plugin-space/types';
import { Filter, type Space, fullyQualifiedId, getSpace } from '@dxos/react-client/echo';

import { MeetingCapabilities } from './capabilities';
import { MEETING_PLUGIN } from '../meta';
import { MeetingAction, MeetingType } from '../types';

export default (context: PluginsContext) =>
  contributes(Capabilities.AppGraphBuilder, [
    createExtension({
      id: `${MEETING_PLUGIN}/active-meeting`,
      filter: (node): node is Node<null> => node.id === 'root',
      connector: ({ node }) => {
        const call = context.requestCapability(MeetingCapabilities.CallManager);
        if (!call.joined) {
          return [];
        }

        return [
          {
            id: `${node.id}${ATTENDABLE_PATH_SEPARATOR}active-meeting`,
            type: DECK_COMPANION_TYPE,
            data: null,
            properties: {
              label: ['meeting panel label', { ns: MEETING_PLUGIN }],
              icon: 'ph--video-conference--regular',
              position: 'hoist',
              disposition: 'hidden',
            },
          },
        ];
      },
    }),

    createExtension({
      id: `${MEETING_PLUGIN}/root`,
      filter: (node): node is Node<Space> => node.type === SPACE_TYPE,
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
                  icon: 'ph--video-conference--regular',
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
      id: `${MEETING_PLUGIN}/share-meeting-link`,
      filter: (node): node is Node<MeetingType> =>
        isInstanceOf(MeetingType, node.data) && !getSpace(node.data)?.properties[COMPOSER_SPACE_LOCK],
      actions: ({ node }) => [
        {
          id: `${fullyQualifiedId(node.data)}/action/share-meeting-link`,
          data: async () => {
            const { dispatchPromise: dispatch } = context.requestCapability(Capabilities.IntentDispatcher);
            const target = node.data;
            const space = getSpace(target);
            invariant(space);
            await dispatch(
              createIntent(SpaceAction.GetShareLink, {
                space,
                target: target && fullyQualifiedId(target),
                copyToClipboard: true,
              }),
            );
          },
          properties: {
            label: ['share meeting link label', { ns: MEETING_PLUGIN }],
            icon: 'ph--share-network--regular',
          },
        },
      ],
    }),

    createExtension({
      id: `${MEETING_PLUGIN}/meeting-summary`,
      filter: (node): node is Node<MeetingType> => isInstanceOf(MeetingType, node.data),
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
          id: `${fullyQualifiedId(node.data)}${ATTENDABLE_PATH_SEPARATOR}summary`,
          type: PLANK_COMPANION_TYPE,
          data: 'summary',
          properties: {
            label: ['meeting summary label', { ns: MEETING_PLUGIN }],
            icon: 'ph--book-open-text--regular',
            disposition: 'hidden',
            schema: DocumentType,
            getIntent: ({ meeting }: { meeting: MeetingType }) => createIntent(MeetingAction.Summarize, { meeting }),
          },
        },
      ],
    }),
  ]);
