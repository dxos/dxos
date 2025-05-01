//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, createIntent, type PluginsContext } from '@dxos/app-framework';
import { fullyQualifiedId, getSpace, makeRef, type Space } from '@dxos/client/echo';
import { generateName } from '@dxos/display-name';
import { getSchemaTypename, isInstanceOf } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { ClientCapabilities } from '@dxos/plugin-client';
import { PLANK_COMPANION_TYPE, ATTENDABLE_PATH_SEPARATOR } from '@dxos/plugin-deck/types';
import { createExtension, type Node } from '@dxos/plugin-graph';
import { MeetingCapabilities, type CallState, type MediaState } from '@dxos/plugin-meeting';
import { MeetingType } from '@dxos/plugin-meeting/types';
import { type buf } from '@dxos/protocols/buf';
import { type TranscriptionPayloadSchema } from '@dxos/protocols/buf/dxos/edge/calls_pb';
import { keyToFallback } from '@dxos/util';

import { TranscriptionCapabilities } from './capabilities';
import { TRANSCRIPTION_PLUGIN } from '../meta';
import { TranscriptionManager } from '../transcriber';
import { TranscriptionAction, TranscriptType } from '../types';

// TODO(wittjosiah): Factor out.
// TODO(wittjosiah): Can we stop using protobuf for this?
type TranscriptionPayload = buf.MessageInitShape<typeof TranscriptionPayloadSchema>;

const getMeetingTranscript = async (
  context: PluginsContext,
  meeting: MeetingType,
): Promise<TranscriptType | undefined> => {
  const { dispatchPromise: dispatch } = context.requestCapability(Capabilities.IntentDispatcher);

  const typename = getSchemaTypename(TranscriptType)!;
  const existing = await meeting.artifacts[typename]?.load();
  if (existing instanceof TranscriptType) {
    return existing;
  }

  const space = getSpace(meeting);
  invariant(space);
  const { data } = await dispatch(createIntent(TranscriptionAction.Create, { spaceId: space.id }));
  meeting.artifacts[typename] = makeRef(data!.object);
  return data?.object;
};

// TODO(wittjosiah): Introduce a sound that plays when transcription is activated/deactivated.
export default (context: PluginsContext) =>
  contributes(Capabilities.AppGraphBuilder, [
    createExtension({
      id: `${TRANSCRIPTION_PLUGIN}/meeting-transcript`,
      filter: (node): node is Node<MeetingType> =>
        isInstanceOf(MeetingType, node.data) && node.type !== PLANK_COMPANION_TYPE,
      actions: ({ node }) => {
        const meeting = node.data;
        const state = context.requestCapability(TranscriptionCapabilities.MeetingTranscriptionState);
        return [
          {
            id: `${fullyQualifiedId(meeting)}/action/start-stop-transcription`,
            data: async () => {
              // NOTE: We are not saving the state of the transcription manager here.
              // We expect the state to be updated through `onCallStateUpdated` once it is propagated through Swarm.
              // This is done to avoid race conditions and to not handle optimistic updates.

              const transcript = await getMeetingTranscript(context, meeting);
              invariant(transcript, 'Failed to create transcript');

              const call = context.requestCapability(MeetingCapabilities.CallManager);
              call.setActivity(getSchemaTypename(TranscriptType)!, {
                enabled: !state.enabled,
                queueDxn: transcript.queue.dxn.toString(),
              });
            },
            properties: {
              label: state.enabled
                ? ['stop transcription label', { ns: TRANSCRIPTION_PLUGIN }]
                : ['start transcription label', { ns: TRANSCRIPTION_PLUGIN }],
              icon: 'ph--subtitles--regular',
              disposition: 'toolbar',
              classNames: state.enabled ? 'bg-callAlert' : '',
            },
          },
        ];
      },
      connector: ({ node }) => {
        const meeting = node.data;
        const client = context.requestCapability(ClientCapabilities.Client);
        const state = context.requestCapability(TranscriptionCapabilities.MeetingTranscriptionState);

        return [
          {
            id: `${fullyQualifiedId(meeting)}${ATTENDABLE_PATH_SEPARATOR}${getSchemaTypename(TranscriptType)}`,
            type: PLANK_COMPANION_TYPE,
            data: meeting.artifacts[getSchemaTypename(TranscriptType)!]?.target,
            properties: {
              label: ['transcript companion label', { ns: TRANSCRIPTION_PLUGIN }],
              icon: 'ph--subtitles--regular',
              disposition: 'hidden',
              schema: TranscriptType,
              getIntent: ({ space }: { space: Space }) =>
                createIntent(TranscriptionAction.Create, { spaceId: space.id }),
              onJoin: () => {
                const transcriptionManager = new TranscriptionManager(client.edge);
                const identity = client.halo.identity.get();
                invariant(identity);
                transcriptionManager.setName(
                  identity.profile?.displayName ?? generateName(identity.identityKey.toHex()),
                );
                const fallbackValue = keyToFallback(identity!.identityKey);
                const userHue = identity!.profile?.data?.hue || fallbackValue.hue;
                transcriptionManager.setHue(userHue);
                void transcriptionManager.open();
                state.transcriptionManager = transcriptionManager;
              },
              onLeave: () => {
                void state.transcriptionManager?.close();
                state.transcriptionManager = undefined;
                state.enabled = false;
              },
              onCallStateUpdated: (callState: CallState) => {
                const typename = getSchemaTypename(TranscriptType);
                const transcription = typename ? callState.activities?.[typename] : undefined;
                if (!transcription?.payload) {
                  return;
                }

                const payload: TranscriptionPayload = transcription.payload;
                state.enabled = !!payload.enabled;
                void state.transcriptionManager?.setEnabled(payload.enabled);
                void state.transcriptionManager?.setQueue(payload.queueDxn);
              },
              onMediaStateUpdated: ([mediaState, isSpeaking]: [MediaState, boolean]) => {
                void state.transcriptionManager?.setAudioTrack(mediaState.audioTrack);
                void state.transcriptionManager?.setRecording(isSpeaking);
              },
            },
          },
        ];
      },
    }),
  ]);
