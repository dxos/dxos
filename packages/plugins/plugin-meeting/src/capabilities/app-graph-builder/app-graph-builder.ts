//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';
import { Obj, Type } from '@dxos/echo';
import { AtomObj } from '@dxos/echo-atom';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { Operation } from '@dxos/operation';
import { ATTENDABLE_PATH_SEPARATOR, DeckOperation, PLANK_COMPANION_TYPE } from '@dxos/plugin-deck/types';
import { CreateAtom, GraphBuilder } from '@dxos/plugin-graph';
import { COMPOSER_SPACE_LOCK } from '@dxos/plugin-space';
import { SpaceOperation } from '@dxos/plugin-space/types';
import { Channel, ThreadCapabilities } from '@dxos/plugin-thread/types';
import { SpaceState, getSpace } from '@dxos/react-client/echo';

import { meta } from '../../meta';
import { Meeting, MeetingCapabilities, MeetingOperation } from '../../types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const extensions = yield* Effect.all([
      // TODO(wittjosiah): This currently won't _start_ the call but will navigate to the correct channel.
      GraphBuilder.createTypeExtension({
        id: `${meta.id}/share-call-link`,
        type: Channel.Channel,
        actions: (channel, get) => {
          const space = getSpace(channel);
          const state = space && get(CreateAtom.fromObservable(space.state));
          if (!space || state !== SpaceState.SPACE_READY || space.properties[COMPOSER_SPACE_LOCK]) {
            return Effect.succeed([]);
          }
          return Effect.succeed([
            {
              id: `${Obj.getDXN(channel).toString()}/action/share-meeting-link`,
              data: Effect.fnUntraced(function* () {
                invariant(space);
                yield* Operation.invoke(SpaceOperation.GetShareLink, {
                  space,
                  target: Obj.getDXN(channel).toString(),
                  copyToClipboard: true,
                });
              }),
              properties: {
                label: ['share call link label', { ns: meta.id }],
                icon: 'ph--share-network--regular',
              },
            },
          ]);
        },
      }),

      GraphBuilder.createTypeExtension({
        id: `${meta.id}/call-thread`,
        type: Channel.Channel,
        connector: Effect.fnUntraced(function* (channel, get) {
          const store = yield* Capability.get(MeetingCapabilities.State);
          const meeting = get(Atom.make((get) => get(store.stateAtom).activeMeeting));
          if (!meeting) {
            return [];
          }

          const callManager = yield* Capability.get(ThreadCapabilities.CallManager);
          const channelDxn = Obj.getDXN(channel).toString();
          const joined = get(callManager.joinedAtom);
          const roomId = get(callManager.roomIdAtom);
          if (!joined || roomId !== channelDxn) {
            return [];
          }

          return [
            {
              id: `${channelDxn}${ATTENDABLE_PATH_SEPARATOR}meeting-thread`,
              type: PLANK_COMPANION_TYPE,
              data: get(AtomObj.make(meeting.thread)),
              properties: {
                label: ['meeting thread label', { ns: meta.id }],
                icon: 'ph--chat-text--regular',
                position: 'hoist',
                disposition: 'hidden',
              },
            },
          ];
        }),
      }),

      GraphBuilder.createTypeExtension({
        id: `${meta.id}/call-companion`,
        type: Channel.Channel,
        connector: Effect.fnUntraced(function* (channel, get) {
          const callManager = yield* Capability.get(ThreadCapabilities.CallManager);
          const channelDxn = Obj.getDXN(channel).toString();
          const joined = get(callManager.joinedAtom);
          const roomId = get(callManager.roomIdAtom);
          if (!joined || roomId !== channelDxn) {
            return [];
          }

          const store = yield* Capability.get(MeetingCapabilities.State);
          const data = get(Atom.make((get) => get(store.stateAtom).activeMeeting ?? 'meeting'));

          return [
            {
              id: `${channelDxn}${ATTENDABLE_PATH_SEPARATOR}meeting`,
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
        }),
      }),

      GraphBuilder.createTypeExtension({
        id: `${meta.id}/call-transcript`,
        type: Channel.Channel,
        actions: Effect.fnUntraced(function* (channel, get) {
          const store = yield* Capability.get(MeetingCapabilities.State);
          const transcriptionManager = get(Atom.make((get) => get(store.stateAtom).transcriptionManager));
          const enabled = transcriptionManager ? get(transcriptionManager.enabledAtom) : false;
          return [
            {
              id: `${Obj.getDXN(channel).toString()}/action/start-stop-transcription`,
              data: Effect.fnUntraced(function* () {
                const store = yield* Capability.get(MeetingCapabilities.State);
                let meeting = store.state.activeMeeting;
                if (!meeting) {
                  const db = Obj.getDatabase(channel);
                  invariant(db);
                  const createResult = yield* Operation.invoke(MeetingOperation.Create, { channel });
                  const addResult = yield* Operation.invoke(SpaceOperation.AddObject, {
                    target: db,
                    hidden: true,
                    object: createResult.object,
                  });
                  yield* Operation.invoke(MeetingOperation.SetActive, { object: addResult.object });
                  meeting = addResult.object as Meeting.Meeting;
                }

                const callManager = yield* Capability.get(ThreadCapabilities.CallManager);
                const transcript = yield* Effect.promise(() => meeting.transcript.load());
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
                  yield* Operation.invoke(DeckOperation.ChangeCompanion, { primary, companion });
                }
              }),
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
        }),
        connector: Effect.fnUntraced(function* (channel, get) {
          const store = yield* Capability.get(MeetingCapabilities.State);
          const meeting = get(Atom.make((get) => get(store.stateAtom).activeMeeting));
          if (!meeting) {
            return [];
          }

          return [
            {
              id: `${Obj.getDXN(channel).toString()}${ATTENDABLE_PATH_SEPARATOR}transcript`,
              type: PLANK_COMPANION_TYPE,
              data: get(AtomObj.make(meeting.transcript)),
              properties: {
                label: ['transcript companion label', { ns: meta.id }],
                icon: 'ph--subtitles--regular',
                position: 'hoist',
                disposition: 'hidden',
              },
            },
          ];
        }),
      }),

      GraphBuilder.createTypeExtension({
        id: `${meta.id}/meeting-transcript-companion`,
        type: Meeting.Meeting,
        connector: (meeting, get) =>
          Effect.succeed([
            {
              id: `${Obj.getDXN(meeting).toString()}${ATTENDABLE_PATH_SEPARATOR}transcript`,
              type: PLANK_COMPANION_TYPE,
              data: get(AtomObj.make(meeting.transcript)),
              properties: {
                label: ['transcript companion label', { ns: meta.id }],
                icon: 'ph--subtitles--regular',
                position: 'hoist',
                disposition: 'hidden',
              },
            },
          ]),
      }),
    ]);

    return Capability.contributes(Common.Capability.AppGraphBuilder, extensions);
  }),
);
