//
// Copyright 2025 DXOS.org
//

import { Rx } from '@effect-rx/rx-react';
import * as Option from 'effect/Option';
import * as pipe from 'effect/pipe';

import { Capabilities, type PluginContext, chain, contributes, createIntent } from '@dxos/app-framework';
import { Obj, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { ATTENDABLE_PATH_SEPARATOR, DeckAction, PLANK_COMPANION_TYPE } from '@dxos/plugin-deck/types';
import { createExtension, rxFromObservable, rxFromSignal } from '@dxos/plugin-graph';
import { COMPOSER_SPACE_LOCK } from '@dxos/plugin-space';
import { SpaceAction } from '@dxos/plugin-space/types';
import { ThreadCapabilities } from '@dxos/plugin-thread';
import { ChannelType } from '@dxos/plugin-thread/types';
import { SpaceState, fullyQualifiedId, getSpace } from '@dxos/react-client/echo';

import { meta } from '../meta';
import { Meeting, MeetingAction } from '../types';

import { MeetingCapabilities } from './capabilities';

export default (context: PluginContext) =>
  contributes(Capabilities.AppGraphBuilder, [
    // TODO(wittjosiah): This currently won't _start_ the call but will navigate to the correct channel.
    createExtension({
      id: `${meta.id}/share-call-link`,
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
                  label: ['share call link label', { ns: meta.id }],
                  icon: 'ph--share-network--regular',
                },
              },
            ]),
            Option.getOrElse(() => []),
          ),
        ),
    }),

    createExtension({
      id: `${meta.id}/call-thread`,
      connector: (node) => {
        return Rx.make((get) =>
          pipe(
            get(node),
            Option.map((node) => node.data),
            Option.filter(Obj.instanceOf(ChannelType)),
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
                    label: ['meeting thread label', { ns: meta.id }],
                    icon: 'ph--chat-text--regular',
                    position: 'hoist',
                    disposition: 'hidden',
                  },
                },
              ];
            }),
            Option.getOrElse(() => []),
          ),
        );
      },
    }),

    createExtension({
      id: `${meta.id}/call-companion`,
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
                    label: [data === 'meeting' ? 'meeting list label' : 'meeting companion label', { ns: meta.id }],
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
      id: `${meta.id}/call-transcript`,
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
                    const { dispatchPromise: dispatch } = context.getCapability(Capabilities.IntentDispatcher);

                    let meeting = state.activeMeeting;
                    if (!meeting) {
                      const space = getSpace(channel);
                      invariant(space);
                      const intent = pipe(
                        createIntent(MeetingAction.Create, { channel }),
                        chain(SpaceAction.AddObject, { target: space, hidden: true }),
                        chain(MeetingAction.SetActive),
                      );
                      const { data } = await dispatch(intent);
                      meeting = data!.object as Meeting.Meeting;
                    }

                    const callManager = context.getCapability(ThreadCapabilities.CallManager);
                    const transcript = await meeting.transcript.load();
                    const transcriptionEnabled = !enabled;
                    callManager.setActivity(Type.getTypename(Meeting.Meeting)!, {
                      meetingId: fullyQualifiedId(meeting),
                      transcriptDxn: transcript.queue.dxn.toString(),
                      transcriptionEnabled,
                    });

                    if (!transcriptionEnabled) {
                      log.warn('transcription disabled');
                    } else {
                      const primary = fullyQualifiedId(channel);
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
                    label: ['transcript companion label', { ns: meta.id }],
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
      id: `${meta.id}/meeting-transcript-companion`,
      connector: (node) =>
        Rx.make((get) =>
          pipe(
            get(node),
            Option.flatMap((node) =>
              Obj.instanceOf(Meeting.Meeting, node.data) ? Option.some(node.data) : Option.none(),
            ),
            Option.map((meeting) => {
              return [
                {
                  id: `${fullyQualifiedId(meeting)}${ATTENDABLE_PATH_SEPARATOR}transcript`,
                  type: PLANK_COMPANION_TYPE,
                  data: get(rxFromSignal(() => meeting.transcript.target)),
                  properties: {
                    label: ['transcript companion label', { ns: meta.id }],
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
