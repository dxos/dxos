//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';

import { Capability, Common, chain, createIntent } from '@dxos/app-framework';
import { Obj, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { ATTENDABLE_PATH_SEPARATOR, DeckAction, PLANK_COMPANION_TYPE } from '@dxos/plugin-deck/types';
import { CreateAtom, GraphBuilder } from '@dxos/plugin-graph';
import { COMPOSER_SPACE_LOCK } from '@dxos/plugin-space';
import { SpaceAction } from '@dxos/plugin-space/types';
import { ThreadCapabilities } from '@dxos/plugin-thread';
import { Channel } from '@dxos/plugin-thread/types';
import { SpaceState, getSpace } from '@dxos/react-client/echo';

import { meta } from '../../meta';
import { Meeting, MeetingAction, MeetingCapabilities } from '../../types';

export default Capability.makeModule((context) =>
  Effect.sync(() => {
    return Capability.contributes(Common.Capability.AppGraphBuilder, [
      // TODO(wittjosiah): This currently won't _start_ the call but will navigate to the correct channel.
      GraphBuilder.createTypeExtension({
        id: `${meta.id}/share-call-link`,
        type: Channel.Channel,
        actions: (channel, get) => {
          const space = getSpace(channel);
          const state = space && get(CreateAtom.fromObservable(space.state));
          if (!space || state !== SpaceState.SPACE_READY || space.properties[COMPOSER_SPACE_LOCK]) {
            return [];
          }
          return [
            {
              id: `${Obj.getDXN(channel).toString()}/action/share-meeting-link`,
              data: async () => {
                const { dispatchPromise: dispatch } = context.getCapability(Common.Capability.IntentDispatcher);
                invariant(space);
                await dispatch(
                  createIntent(SpaceAction.GetShareLink, {
                    space,
                    target: Obj.getDXN(channel).toString(),
                    copyToClipboard: true,
                  }),
                );
              },
              properties: {
                label: ['share call link label', { ns: meta.id }],
                icon: 'ph--share-network--regular',
              },
            },
          ];
        },
      }),

      GraphBuilder.createTypeExtension({
        id: `${meta.id}/call-thread`,
        type: Channel.Channel,
        connector: (channel, get) => {
          const state = context.getCapability(MeetingCapabilities.State);
          const meeting = get(CreateAtom.fromSignal(() => state.activeMeeting));
          if (!meeting) {
            return [];
          }

          const callManager = context.getCapability(ThreadCapabilities.CallManager);
          const joined = get(
            CreateAtom.fromSignal(() => callManager.joined && callManager.roomId === Obj.getDXN(channel).toString()),
          );
          if (!joined) {
            return [];
          }

          return [
            {
              id: `${Obj.getDXN(channel).toString()}${ATTENDABLE_PATH_SEPARATOR}meeting-thread`,
              type: PLANK_COMPANION_TYPE,
              data: get(CreateAtom.fromSignal(() => meeting.thread.target)),
              properties: {
                label: ['meeting thread label', { ns: meta.id }],
                icon: 'ph--chat-text--regular',
                position: 'hoist',
                disposition: 'hidden',
              },
            },
          ];
        },
      }),

      GraphBuilder.createTypeExtension({
        id: `${meta.id}/call-companion`,
        type: Channel.Channel,
        connector: (channel, get) => {
          const callManager = context.getCapability(ThreadCapabilities.CallManager);
          const isCallActive = get(
            CreateAtom.fromSignal(() => callManager.joined && callManager.roomId === Obj.getDXN(channel).toString()),
          );
          if (!isCallActive) {
            return [];
          }

          const state = context.getCapability(MeetingCapabilities.State);
          const data = get(CreateAtom.fromSignal(() => state.activeMeeting ?? 'meeting'));

          return [
            {
              id: `${Obj.getDXN(channel).toString()}${ATTENDABLE_PATH_SEPARATOR}meeting`,
              type: PLANK_COMPANION_TYPE,
              data,
              properties: {
                label: [data === 'meeting' ? 'meeting list label' : 'meeting companion label', { ns: meta.id }],
                icon: 'ph--note--regular',
                position: 'hoist',
                disposition: 'hidden',
              },
            },
          ];
        },
      }),

      GraphBuilder.createTypeExtension({
        id: `${meta.id}/call-transcript`,
        type: Channel.Channel,
        actions: (channel, get) => {
          const state = context.getCapability(MeetingCapabilities.State);
          const enabled = get(CreateAtom.fromSignal(() => state.transcriptionManager?.enabled ?? false));
          return [
            {
              id: `${Obj.getDXN(channel).toString()}/action/start-stop-transcription`,
              data: async () => {
                // NOTE: We are not saving the state of the transcription manager here.
                // We expect the state to be updated through `onCallStateUpdated` once it is propagated through Swarm.
                // This is done to avoid race conditions and to not handle optimistic updates.
                const { dispatchPromise: dispatch } = context.getCapability(Common.Capability.IntentDispatcher);

                let meeting = state.activeMeeting;
                if (!meeting) {
                  const db = Obj.getDatabase(channel);
                  invariant(db);
                  const intent = Function.pipe(
                    createIntent(MeetingAction.Create, { channel }),
                    chain(SpaceAction.AddObject, { target: db, hidden: true }),
                    chain(MeetingAction.SetActive),
                  );
                  const { data } = await dispatch(intent);
                  meeting = data!.object as Meeting.Meeting;
                }

                const callManager = context.getCapability(ThreadCapabilities.CallManager);
                const transcript = await meeting.transcript.load();
                const transcriptionEnabled = !enabled;
                callManager.setActivity(Type.getTypename(Meeting.Meeting)!, {
                  meetingId: Obj.getDXN(meeting).toString(),
                  transcriptDxn: transcript.queue.dxn.toString(),
                  transcriptionEnabled,
                });

                if (!transcriptionEnabled) {
                  log.warn('transcription disabled');
                } else {
                  const primary = Obj.getDXN(channel).toString();
                  const companion = `${primary}${ATTENDABLE_PATH_SEPARATOR}transcript`;
                  await dispatch(createIntent(DeckAction.ChangeCompanion, { primary, companion }));
                }
              },
              properties: {
                label: enabled
                  ? ['stop transcription label', { ns: meta.id }]
                  : ['start transcription label', { ns: meta.id }],
                icon: 'ph--subtitles--regular',
                disposition: 'toolbar',
                classNames: enabled ? 'bg-callAlert' : '',
              },
            },
          ];
        },
        connector: (channel, get) => {
          const state = context.getCapability(MeetingCapabilities.State);
          const meeting = get(CreateAtom.fromSignal(() => state.activeMeeting));
          if (!meeting) {
            return [];
          }

          return [
            {
              id: `${Obj.getDXN(channel).toString()}${ATTENDABLE_PATH_SEPARATOR}transcript`,
              type: PLANK_COMPANION_TYPE,
              data: get(CreateAtom.fromSignal(() => meeting.transcript.target)),
              properties: {
                label: ['transcript companion label', { ns: meta.id }],
                icon: 'ph--subtitles--regular',
                position: 'hoist',
                disposition: 'hidden',
              },
            },
          ];
        },
      }),

      GraphBuilder.createTypeExtension({
        id: `${meta.id}/meeting-transcript-companion`,
        type: Meeting.Meeting,
        connector: (meeting, get) => [
          {
            id: `${Obj.getDXN(meeting).toString()}${ATTENDABLE_PATH_SEPARATOR}transcript`,
            type: PLANK_COMPANION_TYPE,
            data: get(CreateAtom.fromSignal(() => meeting.transcript.target)),
            properties: {
              label: ['transcript companion label', { ns: meta.id }],
              icon: 'ph--subtitles--regular',
              position: 'hoist',
              disposition: 'hidden',
            },
          },
        ],
      }),
    ]);
  }),
);
