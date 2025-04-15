//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, createIntent, type PluginsContext } from '@dxos/app-framework';
import { fullyQualifiedId, getSpace, makeRef, type Space } from '@dxos/client/echo';
import { generateName } from '@dxos/display-name';
import { getSchemaTypename } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { ClientCapabilities } from '@dxos/plugin-client';
import { COMPANION_TYPE } from '@dxos/plugin-deck/types';
import { createExtension, type Node } from '@dxos/plugin-graph';
import { MeetingCapabilities, type CallState, type MediaState } from '@dxos/plugin-meeting';
import { MeetingType } from '@dxos/plugin-meeting/types';
import { buf } from '@dxos/protocols/buf';
import {
  TranscriptionPayloadSchema,
  type TranscriptionPayload as TranscriptionPayloadProto,
} from '@dxos/protocols/buf/dxos/edge/calls_pb';
import { keyToFallback } from '@dxos/util';

import { TranscriptionCapabilities } from './capabilities';
import { TRANSCRIPTION_PLUGIN } from '../meta';
import { TranscriptionManager } from '../transcriber';
import { TranscriptionAction, TranscriptType } from '../types';

// TODO(wittjosiah): Factor out.
// TODO(wittjosiah): Can we stop using protobuf for this?
type TranscriptionPayload = buf.MessageInitShape<typeof TranscriptionPayloadSchema>;
const codec = {
  encode: (message: TranscriptionPayload): Uint8Array => {
    return buf.toBinary(TranscriptionPayloadSchema, buf.create(TranscriptionPayloadSchema, message));
  },
  decode: (message: Uint8Array): TranscriptionPayloadProto => {
    return buf.fromBinary(TranscriptionPayloadSchema, message);
  },
};

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
      filter: (node): node is Node<MeetingType> => node.data instanceof MeetingType,
      actions: ({ node }) => {
        const meeting = node.data;
        const state = context.requestCapability(TranscriptionCapabilities.MeetingTranscriptionState);
        return [
          {
            id: `${fullyQualifiedId(meeting)}/action/start-stop-transcription`,
            data: async () => {
              const call = context.requestCapability(MeetingCapabilities.CallManager);
              invariant(state.transcriptionManager);
              state.enabled = !state.enabled;
              void state.transcriptionManager.setEnabled(state.enabled);
              const transcript = await getMeetingTranscript(context, meeting);
              invariant(transcript, 'Failed to create transcript');
              call.setActivity(getSchemaTypename(TranscriptType)!, {
                value: codec.encode({
                  enabled: state.enabled,
                  queueDxn: transcript.queue.dxn.toString(),
                }),
              });
            },
            properties: {
              label: state.enabled
                ? ['stop transcription label', { ns: TRANSCRIPTION_PLUGIN }]
                : ['start transcription label', { ns: TRANSCRIPTION_PLUGIN }],
              icon: 'ph--record--regular',
              disposition: 'toolbar',
              classNames: state.enabled ? 'text-activeInCall' : '',
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
            id: `${fullyQualifiedId(meeting)}/companion/transcript`,
            type: COMPANION_TYPE,
            data: node.id,
            properties: {
              label: ['transcript companion label', { ns: TRANSCRIPTION_PLUGIN }],
              icon: 'ph--subtitles--regular',
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
                if (!transcription?.payload?.value) {
                  return;
                }

                const payload = codec.decode(transcription.payload.value);
                state.enabled = payload.enabled;
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
