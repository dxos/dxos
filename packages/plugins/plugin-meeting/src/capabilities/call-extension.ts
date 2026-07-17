//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { type CallState, type MediaState } from '@dxos/plugin-calls';
import { CallsCapabilities } from '@dxos/plugin-calls/types';
import { ClientCapabilities } from '@dxos/plugin-client';
import { TranscriptionCapabilities } from '@dxos/plugin-transcription/types';
import { type buf } from '@dxos/protocols/buf';
import { type MeetingPayloadSchema } from '@dxos/protocols/buf/dxos/edge/calls_pb';
import { type Channel } from '@dxos/types';

import { Meeting, MeetingCapabilities, MeetingOperation } from '#types';

// TODO(wittjosiah): Factor out.
// TODO(wittjosiah): Can we stop using protobuf for this?
type MeetingPayload = buf.MessageInitShape<typeof MeetingPayloadSchema>;

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // Get context for lazy capability access in callbacks.
    const capabilities = yield* Capability.Service;

    const store = yield* MeetingCapabilities.State;

    return [
      Capability.provide(CallsCapabilities.EventHandler, {
        onJoin: async ({ channel }: { channel?: Channel.Channel }) => {
          const client = capabilities.get(ClientCapabilities.Client);
          const identity = client.halo.identity.get();
          invariant(identity);

          // TODO(burdon): The TranscriptionManager singleton is part of the state and should just be updated here.
          const transcriptionManager = await capabilities
            .get(TranscriptionCapabilities.TranscriptionManagerProvider)({})
            .open();
          store.updateState((current) => ({ ...current, transcriptionManager }));
        },
        onLeave: async () => {
          const { transcriptionManager } = store.state;
          await transcriptionManager?.close();
          store.updateState(() => ({}));
        },
        onCallStateUpdated: async (callState: CallState) => {
          const { invokePromise } = capabilities.get(Capabilities.OperationInvoker);
          const typename = Type.getTypename(Meeting.Meeting);
          const activity = typename ? callState.activities?.[typename] : undefined;
          if (!activity?.payload) {
            return;
          }

          const payload: MeetingPayload = activity.payload;
          await invokePromise(MeetingOperation.HandlePayload, payload);
        },
        onMediaStateUpdated: async ([mediaState, isSpeaking]: [MediaState, boolean]) => {
          const { transcriptionManager } = store.state;
          void transcriptionManager?.setAudioTrack(mediaState.audioTrack);
          void transcriptionManager?.setRecording(isSpeaking);
        },
      }),
    ];
  }),
);
