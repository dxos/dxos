//
// Copyright 2025 DXOS.org
//

import { Rx } from '@effect-rx/rx-react';
import { Option, pipe } from 'effect';

import { Capabilities, contributes, createIntent, type PluginContext } from '@dxos/app-framework';
import { isInstanceOf } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { PLANK_COMPANION_TYPE, ATTENDABLE_PATH_SEPARATOR, DECK_COMPANION_TYPE } from '@dxos/plugin-deck/types';
import { createExtension, ROOT_ID, rxFromObservable } from '@dxos/plugin-graph';
import { DocumentType } from '@dxos/plugin-markdown/types';
import { COMPOSER_SPACE_LOCK, rxFromQuery } from '@dxos/plugin-space';
import { SPACE_TYPE, SpaceAction } from '@dxos/plugin-space/types';
import { Query, type QueryResult, SpaceState, fullyQualifiedId, getSpace, isSpace } from '@dxos/react-client/echo';

import { MeetingCapabilities } from './capabilities';
import { MEETING_PLUGIN } from '../meta';
import { MeetingAction, MeetingType } from '../types';

export default (context: PluginContext) =>
  contributes(Capabilities.AppGraphBuilder, [
    createExtension({
      id: `${MEETING_PLUGIN}/active-meeting`,
      connector: (node) =>
        Rx.make((get) =>
          pipe(
            get(node),
            Option.flatMap((node) => (node.id === ROOT_ID ? Option.some(node) : Option.none())),
            Option.map((node) => {
              const [call] = get(context.capabilities(MeetingCapabilities.CallManager));
              return call?.joined
                ? [
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
                  ]
                : [];
            }),
            Option.getOrElse(() => []),
          ),
        ),
    }),

    createExtension({
      id: `${MEETING_PLUGIN}/root`,
      connector: (node) => {
        let query: QueryResult<MeetingType> | undefined;
        return Rx.make((get) =>
          pipe(
            get(node),
            Option.flatMap((node) =>
              node.type === SPACE_TYPE && isSpace(node.data) ? Option.some(node.data) : Option.none(),
            ),
            Option.map((space) => {
              if (!query) {
                query = space.db.query(Query.type(MeetingType));
              }

              const meetings = get(rxFromQuery(query));
              return meetings.length > 0
                ? [
                    {
                      id: `${space.id}-meetings`,
                      type: `${MEETING_PLUGIN}/meetings`,
                      data: null,
                      properties: {
                        label: ['meetings label', { ns: MEETING_PLUGIN }],
                        icon: 'ph--video-conference--regular',
                        space,
                      },
                    },
                  ]
                : [];
            }),
            Option.getOrElse(() => []),
          ),
        );
      },
    }),

    // TODO(wittjosiah): Show presence dots for meetings based on active participants in the call.
    // TODO(wittjosiah): Highlight active meetings in L1.
    //  Separate section for active meetings, with different icons & labels.
    //  Track active meetings by subscribing to meetings query and polling the swarms of recent meetings in the space.
    createExtension({
      id: `${MEETING_PLUGIN}/meetings`,
      connector: (node) => {
        let query: QueryResult<MeetingType> | undefined;
        return Rx.make((get) =>
          pipe(
            get(node),
            Option.flatMap((node) =>
              node.type === `${MEETING_PLUGIN}/meetings` && isSpace(node.properties.space)
                ? Option.some(node.properties.space)
                : Option.none(),
            ),
            Option.map((space) => {
              if (!query) {
                query = space.db.query(Query.type(MeetingType));
              }

              const [{ metadata }] = get(context.capabilities(Capabilities.Metadata)).filter(
                (
                  capability,
                ): capability is { id: string; metadata: { label: (object: any) => string; icon: string } } =>
                  capability.id === MeetingType.typename,
              );

              return get(rxFromQuery(query))
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
            }),
            Option.getOrElse(() => []),
          ),
        );
      },
    }),

    createExtension({
      id: `${MEETING_PLUGIN}/share-meeting-link`,
      actions: (node) =>
        Rx.make((get) =>
          pipe(
            get(node),
            Option.flatMap((node) => (isInstanceOf(MeetingType, node.data) ? Option.some(node.data) : Option.none())),
            Option.flatMap((meeting) => {
              const space = getSpace(meeting);
              const state = space && get(rxFromObservable(space.state));
              return space && state === SpaceState.SPACE_READY && !space.properties[COMPOSER_SPACE_LOCK]
                ? Option.some(meeting)
                : Option.none();
            }),
            Option.map((meeting) => [
              {
                id: `${fullyQualifiedId(meeting)}/action/share-meeting-link`,
                data: async () => {
                  const { dispatchPromise: dispatch } = context.getCapability(Capabilities.IntentDispatcher);
                  const space = getSpace(meeting);
                  invariant(space);
                  await dispatch(
                    createIntent(SpaceAction.GetShareLink, {
                      space,
                      target: fullyQualifiedId(meeting),
                      copyToClipboard: true,
                    }),
                  );
                },
                properties: {
                  label: ['share meeting link label', { ns: MEETING_PLUGIN }],
                  icon: 'ph--share-network--regular',
                },
              },
            ]),
            Option.getOrElse(() => []),
          ),
        ),
    }),

    createExtension({
      id: `${MEETING_PLUGIN}/meeting-summary`,
      // TODO(wittjosiah): Only show the summarize action if the meeting plausibly completed.
      actions: (node) =>
        Rx.make((get) =>
          pipe(
            get(node),
            Option.flatMap((node) => (isInstanceOf(MeetingType, node.data) ? Option.some(node.data) : Option.none())),
            Option.map((meeting) => [
              {
                id: `${fullyQualifiedId(meeting)}/action/summarize`,
                data: async () => {
                  const { dispatchPromise: dispatch } = context.getCapability(Capabilities.IntentDispatcher);
                  await dispatch(createIntent(MeetingAction.Summarize, { meeting }));
                },
                properties: {
                  label: ['summarize label', { ns: MEETING_PLUGIN }],
                  icon: 'ph--book-open-text--regular',
                },
              },
            ]),
            Option.getOrElse(() => []),
          ),
        ),
      // TODO(wittjosiah): Only show the summary companion if the meeting plausibly completed.
      connector: (node) =>
        Rx.make((get) =>
          pipe(
            get(node),
            Option.flatMap((node) => (isInstanceOf(MeetingType, node.data) ? Option.some(node.data) : Option.none())),
            Option.map((meeting) => [
              {
                id: `${fullyQualifiedId(meeting)}${ATTENDABLE_PATH_SEPARATOR}summary`,
                type: PLANK_COMPANION_TYPE,
                data: 'summary',
                properties: {
                  label: ['meeting summary label', { ns: MEETING_PLUGIN }],
                  icon: 'ph--book-open-text--regular',
                  disposition: 'hidden',
                  schema: DocumentType,
                  getIntent: ({ meeting }: { meeting: MeetingType }) =>
                    createIntent(MeetingAction.Summarize, { meeting }),
                },
              },
            ]),
            Option.getOrElse(() => []),
          ),
        ),
    }),
  ]);
