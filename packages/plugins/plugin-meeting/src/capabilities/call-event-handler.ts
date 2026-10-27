//
// Copyright 2026 DXOS.org
//

import { log } from '@dxos/log';
import type * as CallManager from '@dxos/plugin-calls/CallManager';
import type * as CallsCapabilities from '@dxos/plugin-calls/CallsCapabilities';
import type * as TranscriptionCapabilities from '@dxos/plugin-transcription/TranscriptionCapabilities';
import { type buf } from '@dxos/protocols/buf';
import { type MeetingPayloadSchema } from '@dxos/protocols/buf/dxos/edge/calls_pb';

import { type MeetingCapabilities } from '#types';

// TODO(wittjosiah): Can we stop using protobuf for this?
export type MeetingPayload = buf.MessageInitShape<typeof MeetingPayloadSchema>;

export type CallEventHandlerOptions = {
  store: MeetingCapabilities.MeetingStateStore;
  /** Activity key the meeting payload is broadcast under (the Meeting typename). */
  activityKey: string;
  /** The call's media state now, read when a join completes. */
  getMediaState: () => CallManager.MediaState;
  createTranscriptionManager: () => TranscriptionCapabilities.TranscriptionManager;
  handlePayload: (payload: MeetingPayload) => Promise<void>;
};

/**
 * Drives the meeting's transcription from the call: a transcription manager per joined call, fed the
 * local microphone track and speaking state, and switched on or off by the meeting payload any peer
 * broadcasts.
 */
export const makeCallEventHandler = ({
  store,
  activityKey,
  getMediaState,
  createTranscriptionManager,
  handlePayload,
}: CallEventHandlerOptions): CallsCapabilities.CallProperties => ({
  onJoin: async () => {
    // A rejoin without an intervening leave must not leak the previous call's recorder.
    await store.state.transcriptionManager?.close();
    const transcriptionManager = await createTranscriptionManager().open();
    store.updateState((current) => ({ ...current, transcriptionManager }));
    // Media updates only fire on change, so the track already live at join would otherwise be missed.
    await transcriptionManager.setAudioTrack(getMediaState().audioTrack);
  },
  onLeave: async () => {
    const { transcriptionManager } = store.state;
    await transcriptionManager?.close();
    store.updateState(() => ({}));
  },
  onCallStateUpdated: async (callState: CallManager.CallState) => {
    const activity = callState.activities?.[activityKey];
    if (!activity?.payload) {
      return;
    }

    const payload: MeetingPayload = activity.payload;
    await handlePayload(payload);
  },
  onMediaStateUpdated: async ([mediaState, isSpeaking]: [CallManager.MediaState, boolean]) => {
    const { transcriptionManager } = store.state;
    // Not awaited (media updates must not block on transcription), but a rejection — e.g. no
    // transcription endpoint configured — has to be logged rather than left unhandled.
    void transcriptionManager?.setAudioTrack(mediaState.audioTrack).catch((err) => log.catch(err));
    transcriptionManager?.setRecording(isSpeaking);
  },
});
