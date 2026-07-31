//
// Copyright 2026 DXOS.org
//

import { type RefObject, useCallback, useEffect, useMemo, useRef } from 'react';

import { useOptionalAtomCapabilityState } from '@dxos/app-framework/ui';
import { TranscriptionCapabilities } from '@dxos/plugin-transcription/types';
import { useTranslation } from '@dxos/react-ui';
import { type ChatEditorController } from '@dxos/react-ui-chat';
import { useAudioTrack, useTranscriber } from '@dxos/react-ui-transcription';
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
  const [session] = useOptionalAtomCapabilityState(TranscriptionCapabilities.RecordingSession);
  const [settings] = useOptionalAtomCapabilityState(TranscriptionCapabilities.Settings);

  const active = !!session?.recording && session.id === docId;

  const streamerRef = useRef<PendingTextStreamer | null>(null);

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
      mode: settings?.streamMode ?? 'word',
      wordIntervalMs: settings?.wordIntervalMs ?? 80,
    });
    streamer.start({ anchor: view.state.selection.main.head, placeholder: t('recording.placeholder') });
    streamerRef.current = streamer;

    return () => {
      streamer.dispose();
      streamerRef.current = null;
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
    }),
    [settings?.transcribeAfterMs],
  );

  // Stable identity: a fresh object would change useTranscriber's memo deps every render.
  const recorderConfig = useMemo(() => ({ interval: RECORDER_INTERVAL_MS }), []);

  const audioConstraints = useMemo<MediaTrackConstraints | undefined>(
    () => (settings?.audioDeviceId ? { deviceId: { exact: settings.audioDeviceId } } : undefined),
    [settings?.audioDeviceId],
  );

  const track = useAudioTrack(active, audioConstraints);

  useTranscriber({
    audioStreamTrack: track,
    transcriberConfig,
    recorderConfig,
    onSegments: handleSegments,
  });
};
