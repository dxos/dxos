//
// Copyright 2026 DXOS.org
//

import { type RefObject, useCallback, useEffect, useMemo, useRef } from 'react';

import { useOptionalAtomCapabilityState } from '@dxos/app-framework/ui';
import { EdgeServiceName } from '@dxos/config';
import { log } from '@dxos/log';
import * as TranscriptionCapabilities from '@dxos/plugin-transcription/TranscriptionCapabilities';
import { useEdgeServiceEndpoint } from '@dxos/react-client';
import { useTranslation } from '@dxos/react-ui';
import { type ChatEditorController } from '@dxos/react-ui-chat';
import { isNativeAudioInput, useAudioTrack, useTranscriber } from '@dxos/react-ui-transcription';
import { type ContentBlock } from '@dxos/types';
import { PendingTextStreamer, cancelPendingText, editorPendingTextSink, pendingTextState } from '@dxos/ui-editor';

import { meta } from '#meta';

// Recorder chunk interval; the transcriber's chunk threshold is derived from the buffering setting.
const RECORDER_INTERVAL_MS = 200;

/**
 * Drives word-by-word streaming transcription into the chat editor via PendingTextStreamer.
 * Reads the active RecordingSession and Settings capabilities; activates when the session id
 * matches the given docId and the session is recording.
 */
export const useChatVoiceInput = (docId: string, editorRef: RefObject<ChatEditorController | null>): void => {
  const { t } = useTranslation(meta.profile.key);
  // Voice input is optional: tolerate the transcription plugin being absent (no session ⇒ inactive).
  const [session, setSession] = useOptionalAtomCapabilityState(TranscriptionCapabilities.RecordingSession);
  const [settings] = useOptionalAtomCapabilityState(TranscriptionCapabilities.Settings);
  const endpoint = useEdgeServiceEndpoint(EdgeServiceName.Transcription);

  const active = !!session?.recording && session.id === docId;

  const streamerRef = useRef<PendingTextStreamer | null>(null);
  // Where the pending block will be opened, captured when recording begins: by the time the first
  // transcription lands the selection may have moved.
  const anchorRef = useRef<number | undefined>(undefined);
  const startedRef = useRef(false);

  // Create/destroy the streamer when active transitions.
  useEffect(() => {
    if (!active) {
      return;
    }
    const view = editorRef.current?.view;
    if (!view) {
      return;
    }

    const streamer = new PendingTextStreamer(editorPendingTextSink(view), {
      // Batch by default: a transcription arrives as a finished phrase, and revealing it word by word
      // lags the speaker by the length of what they just said.
      mode: settings?.streamMode ?? 'batch',
      wordIntervalMs: settings?.wordIntervalMs ?? 80,
    });
    // Deliberately not started here. `start` opens the pending-text block, which paints the
    // "Recording…" placeholder and its confirm/discard affordances the moment the mic is tapped —
    // occupying the prompt before there is anything to confirm. The block is opened lazily by the
    // first transcription instead (see `handleSegments`), so tapping the mic changes nothing visible
    // and text simply appears when it arrives.
    anchorRef.current = view.state.selection.main.head;
    startedRef.current = false;
    streamerRef.current = streamer;

    return () => {
      streamer.dispose();
      streamerRef.current = null;
      startedRef.current = false;
      // Drop the placeholder if nothing was transcribed; otherwise leave it for review.
      const currentView = editorRef.current?.view;
      if (currentView) {
        const pending = currentView.state.field(pendingTextState, false);
        if (pending && pending.final.length === 0) {
          currentView.dispatch({ effects: cancelPendingText.of() });
        }
      }
    };
  }, [active, settings?.streamMode, settings?.wordIntervalMs]);

  const handleSegments = useCallback(async (segments: ContentBlock.Transcript[]) => {
    const text = segments
      .map((segment) => segment.text)
      .join(' ')
      .trim();
    if (text.length > 0) {
      if (!startedRef.current) {
        startedRef.current = true;
        // No placeholder: the arriving text is the feedback.
        streamerRef.current?.start({ anchor: anchorRef.current });
      }
      streamerRef.current?.push(text);
    }
  }, []);

  // Derive the transcriber's chunk threshold from the configured initial buffering time.
  const transcriberConfig = useMemo(
    () => ({
      transcribeAfterChunksAmount: Math.max(
        1,
        Math.round((settings?.transcribeAfterMs ?? 4000) / RECORDER_INTERVAL_MS),
      ),
      endpoint,
    }),
    [settings?.transcribeAfterMs, endpoint],
  );

  // Stable identity: a fresh object would change useTranscriber's memo deps every render.
  const recorderConfig = useMemo(() => ({ interval: RECORDER_INTERVAL_MS }), []);

  const audioConstraints = useMemo<MediaTrackConstraints | undefined>(
    () =>
      // A native selection is routed through the audio session, not through constraints: WebKit
      // rejects an id it did not issue, and the rejection stops capture entirely.
      settings?.audioDeviceId && !isNativeAudioInput(settings.audioDeviceId)
        ? { deviceId: { exact: settings.audioDeviceId } }
        : undefined,
    [settings?.audioDeviceId],
  );

  // Gate the mic on the endpoint: `useAudioTrack` calls `getUserMedia` as soon as its flag is
  // true, so without this the permission prompt and recording indicator appear before `open()`
  // rejects for a transcription service that was never configured.
  const track = useAudioTrack(active && !!endpoint, audioConstraints);

  const transcriber = useTranscriber({
    audioStreamTrack: track,
    transcriberConfig,
    recorderConfig,
    onSegments: handleSegments,
  });

  // `useTranscriber` only constructs (and eventually closes) the transcriber — opening it is the
  // consumer's job, and this hook never did, so `Transcriber._open` never ran, its recorder never
  // started, and no audio was captured. The placeholder appeared and nothing ever replaced it.
  useEffect(() => {
    if (!transcriber) {
      return;
    }
    let cancelled = false;
    void transcriber.open().then(
      () => {
        if (!cancelled && active) {
          transcriber.startChunksRecording();
        }
      },
      (err) => {
        // Clear the session on failure (e.g. the microphone was refused) so the prompt does not sit
        // showing "recording" against a transcriber that never opened.
        if (!cancelled) {
          log.catch(err);
          setSession?.(() => null);
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [transcriber, active, setSession]);
};
