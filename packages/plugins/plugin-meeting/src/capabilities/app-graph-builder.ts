//
// Copyright 2025 DXOS.org
//

import { Rx } from '@effect-rx/rx-react';
import { Option, pipe } from 'effect';

import { Capabilities, chain, contributes, createIntent, type PluginContext } from '@dxos/app-framework';
import { Obj, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { PLANK_COMPANION_TYPE, ATTENDABLE_PATH_SEPARATOR } from '@dxos/plugin-deck/types';
import { createExtension, rxFromObservable, rxFromSignal } from '@dxos/plugin-graph';
import { COMPOSER_SPACE_LOCK, rxFromQuery } from '@dxos/plugin-space';
import { SPACE_TYPE, SpaceAction } from '@dxos/plugin-space/types';
import { ThreadCapabilities } from '@dxos/plugin-thread';
import { ChannelType } from '@dxos/plugin-thread/types';
import { Query, type QueryResult, SpaceState, fullyQualifiedId, getSpace, isSpace } from '@dxos/react-client/echo';

import { MeetingCapabilities } from './capabilities';
import { MEETING_PLUGIN } from '../meta';
import { MeetingAction, MeetingType } from '../types';

export default (context: PluginContext) =>
  contributes(Capabilities.AppGraphBuilder, [
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
                        icon: 'ph--note--regular',
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
                .toSorted((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())
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

    // TODO(wittjosiah): This currently won't _start_ the call but will navigate to the correct channel.
    createExtension({
      id: `${MEETING_PLUGIN}/share-call-link`,
      actions: (node) =>
        Rx.make((get) =>
          pipe(
            get(node),
            Option.flatMap((node) => (Obj.instanceOf(ChannelType, node.data) ? Option.some(node.data) : Option.none())),
            Option.flatMap((channel) => {
              const space = getSpace(channel);
              const state = space && get(rxFromObservable(space.state));
              return space && state === SpaceState.SPACE_READY && !space.properties[COMPOSER_SPACE_LOCK]
                ? Option.some(channel)
                : Option.none();
            }),
            Option.map((channel) => [
              {
                id: `${fullyQualifiedId(channel)}/action/share-meeting-link`,
                data: async () => {
                  const { dispatchPromise: dispatch } = context.getCapability(Capabilities.IntentDispatcher);
                  const space = getSpace(channel);
                  invariant(space);
                  await dispatch(
                    createIntent(SpaceAction.GetShareLink, {
                      space,
                      target: fullyQualifiedId(channel),
                      copyToClipboard: true,
                    }),
                  );
                },
                properties: {
                  label: ['share call link label', { ns: MEETING_PLUGIN }],
                  icon: 'ph--share-network--regular',
                },
              },
            ]),
            Option.getOrElse(() => []),
          ),
        ),
    }),

    createExtension({
      id: `${MEETING_PLUGIN}/call-thread`,
      connector: (node) => {
        return Rx.make((get) => {
          return pipe(
            get(node),
            Option.flatMap((node) => (Obj.instanceOf(ChannelType, node.data) ? Option.some(node.data) : Option.none())),
            Option.flatMap((channel) => {
              const state = context.getCapability(MeetingCapabilities.State);
              const meeting = get(rxFromSignal(() => state.activeMeeting));
              return meeting ? Option.some({ channel, meeting }) : Option.none();
            }),
            Option.map(({ channel, meeting }) => {
              const callManager = context.getCapability(ThreadCapabilities.CallManager);
              const joined = get(
                rxFromSignal(() => callManager.joined && callManager.roomId === fullyQualifiedId(channel)),
              );
              if (!joined) {
                return [];
              }

              return [
                {
                  id: `${fullyQualifiedId(channel)}${ATTENDABLE_PATH_SEPARATOR}meeting-thread`,
                  type: PLANK_COMPANION_TYPE,
                  data: get(rxFromSignal(() => meeting.thread.target)),
                  properties: {
                    label: ['meeting thread label', { ns: MEETING_PLUGIN }],
                    icon: 'ph--chat-text--regular',
                    position: 'hoist',
                    disposition: 'hidden',
                  },
                },
              ];
            }),
            Option.getOrElse(() => []),
          );
        });
      },
    }),

    createExtension({
      id: `${MEETING_PLUGIN}/call-companion`,
      connector: (node) =>
        Rx.make((get) =>
          pipe(
            get(node),
            Option.flatMap((node) => (Obj.instanceOf(ChannelType, node.data) ? Option.some(node.data) : Option.none())),
            Option.flatMap((channel) => {
              const callManager = context.getCapability(ThreadCapabilities.CallManager);
              const isCallActive = get(
                rxFromSignal(() => callManager.joined && callManager.roomId === fullyQualifiedId(channel)),
              );
              return isCallActive ? Option.some(channel) : Option.none();
            }),
            Option.map((channel) => {
              const state = context.getCapability(MeetingCapabilities.State);
              const data = get(rxFromSignal(() => state.activeMeeting ?? 'meeting'));

              return [
                {
                  id: `${fullyQualifiedId(channel)}${ATTENDABLE_PATH_SEPARATOR}meeting`,
                  type: PLANK_COMPANION_TYPE,
                  data,
                  properties: {
                    label: [
                      data === 'meeting' ? 'meeting list label' : 'meeting companion label',
                      { ns: MEETING_PLUGIN },
                    ],
                    icon: 'ph--note--regular',
                    position: 'hoist',
                    disposition: 'hidden',
                  },
                },
              ];
            }),
            Option.getOrElse(() => []),
          ),
        ),
    }),

    createExtension({
      id: `${MEETING_PLUGIN}/call-transcript`,
      actions: (node) =>
        Rx.make((get) =>
          pipe(
            get(node),
            Option.flatMap((node) => (Obj.instanceOf(ChannelType, node.data) ? Option.some(node.data) : Option.none())),
            Option.map((channel) => {
              const state = context.getCapability(MeetingCapabilities.State);
              const enabled = get(rxFromSignal(() => state.transcriptionManager?.enabled ?? false));
              return [
                {
                  id: `${fullyQualifiedId(channel)}/action/start-stop-transcription`,
                  data: async () => {
                    // NOTE: We are not saving the state of the transcription manager here.
                    // We expect the state to be updated through `onCallStateUpdated` once it is propagated through Swarm.
                    // This is done to avoid race conditions and to not handle optimistic updates.

                    let meeting = state.activeMeeting;
                    if (!meeting) {
                      const { dispatchPromise: dispatch } = context.getCapability(Capabilities.IntentDispatcher);
                      const space = getSpace(channel);
                      invariant(space);
                      const intent = pipe(
                        createIntent(MeetingAction.Create, { channel }),
                        chain(SpaceAction.AddObject, { target: space, hidden: true }),
                        chain(MeetingAction.SetActive),
                      );
                      const { data } = await dispatch(intent);
                      meeting = data!.object as MeetingType;
                    }

                    const callManager = context.getCapability(ThreadCapabilities.CallManager);
                    const transcript = await meeting.transcript.load();
                    callManager.setActivity(Type.getTypename(MeetingType)!, {
                      meetingId: fullyQualifiedId(meeting),
                      transcriptDxn: transcript.queue.dxn.toString(),
                      transcriptionEnabled: !enabled,
                    });
                  },
                  properties: {
                    label: enabled
                      ? ['stop transcription label', { ns: MEETING_PLUGIN }]
                      : ['start transcription label', { ns: MEETING_PLUGIN }],
                    icon: 'ph--subtitles--regular',
                    disposition: 'toolbar',
                    classNames: enabled ? 'bg-callAlert' : '',
                  },
                },
              ];
            }),
            Option.getOrElse(() => []),
          ),
        ),
      connector: (node) =>
        Rx.make((get) =>
          pipe(
            get(node),
            Option.flatMap((node) => (Obj.instanceOf(ChannelType, node.data) ? Option.some(node.data) : Option.none())),
            Option.flatMap((channel) => {
              const state = context.getCapability(MeetingCapabilities.State);
              const meeting = get(rxFromSignal(() => state.activeMeeting));
              return meeting ? Option.some({ channel, meeting }) : Option.none();
            }),
            Option.map(({ channel, meeting }) => {
              return [
                {
                  id: `${fullyQualifiedId(channel)}${ATTENDABLE_PATH_SEPARATOR}transcript`,
                  type: PLANK_COMPANION_TYPE,
                  data: get(rxFromSignal(() => meeting.transcript.target)),
                  properties: {
                    label: ['transcript companion label', { ns: MEETING_PLUGIN }],
                    icon: 'ph--subtitles--regular',
                    position: 'hoist',
                    disposition: 'hidden',
                  },
                },
              ];
            }),
            Option.getOrElse(() => []),
          ),
        ),
    }),

    createExtension({
      id: `${MEETING_PLUGIN}/meeting-transcript-companion`,
      connector: (node) =>
        Rx.make((get) =>
          pipe(
            get(node),
            Option.flatMap((node) => (Obj.instanceOf(MeetingType, node.data) ? Option.some(node.data) : Option.none())),
            Option.map((meeting) => {
              return [
                {
                  id: `${fullyQualifiedId(meeting)}${ATTENDABLE_PATH_SEPARATOR}transcript`,
                  type: PLANK_COMPANION_TYPE,
                  data: get(rxFromSignal(() => meeting.transcript.target)),
                  properties: {
                    label: ['transcript companion label', { ns: MEETING_PLUGIN }],
                    icon: 'ph--subtitles--regular',
                    position: 'hoist',
                    disposition: 'hidden',
                  },
                },
              ];
            }),
            Option.getOrElse(() => []),
          ),
        ),
    }),
  ]);
