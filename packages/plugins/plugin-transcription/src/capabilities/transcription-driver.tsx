//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { Fragment, useCallback, useEffect, useMemo, useRef } from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { useAtomCapability, useAtomCapabilityState, useCapabilities } from '@dxos/app-framework/ui';
import { log } from '@dxos/log';
import { MarkdownCapabilities } from '@dxos/plugin-markdown/types';
import { type ContentBlock } from '@dxos/types';
import { PendingTextStreamer, cancelPendingText, editorPendingTextSink, pendingTextState } from '@dxos/ui-editor';

import { useAudioTrack, useTranscriber } from '#hooks';
import { meta } from '#meta';
import { TranscriptionCapabilities } from '#types';

// Recorder chunk interval; the transcriber's chunk threshold is derived from the buffering setting.
const RECORDER_INTERVAL_MS = 200;

/**
 * Headless controller driving live transcription into a Markdown editor. Reads the active recording
 * session, captures audio while recording, and dispatches the transcribed text into the target
 * editor as pending-text effects. The user confirms or discards the pending text via the editor's
 * inline affordances. Mounted once, app-wide, via `Capabilities.ReactContext`.
 */
const TranscriptionDriver = () => {
  const [session, setSession] = useAtomCapabilityState(TranscriptionCapabilities.RecordingSession);
  // `useCapabilities` (not `useCapability`) so the driver does not throw when plugin-markdown is absent.
  const [editorViews] = useCapabilities(MarkdownCapabilities.EditorViews);
  const settings = useAtomCapability(TranscriptionCapabilities.Settings);

  const recording = session?.recording ?? false;
  const sessionId = session?.id;
  const track = useAudioTrack(recording);

  // Streams transcribed text into the editor's pending-text block (buffering + word-by-word reveal).
  const streamerRef = useRef<PendingTextStreamer | null>(null);

  useEffect(() => {
    if (!recording || !editorViews || !sessionId) {
      return;
    }
    const entry = editorViews.get(sessionId);
    if (!entry) {
      return;
    }

    // Clicking the toolbar blurs the editor and hides the caret, so anchor + placeholder give
    // immediate feedback while the first transcription is buffered.
    const streamer = new PendingTextStreamer(editorPendingTextSink(entry.view), {
      mode: settings?.streamMode ?? 'word',
      wordIntervalMs: settings?.wordIntervalMs ?? 80,
      // TODO(burdon): postProcess seam for entity extraction → dx-anchor links.
    });
    streamer.start({ anchor: entry.view.state.selection.main.head, placeholder: 'Recording…' });
    streamerRef.current = streamer;

    return () => {
      streamer.flush();
      streamer.dispose();
      streamerRef.current = null;
      // On stop, drop the placeholder if nothing was transcribed; otherwise leave the block for review.
      const current = editorViews.get(sessionId);
      const pending = current?.view.state.field(pendingTextState, false);
      if (current && pending && pending.final.length === 0) {
        current.view.dispatch({ effects: cancelPendingText.of() });
      }
    };
  }, [recording, sessionId, editorViews, settings?.streamMode, settings?.wordIntervalMs]);

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

  const transcriber = useTranscriber({
    audioStreamTrack: track,
    onSegments: handleSegments,
    transcriberConfig,
    recorderConfig: { interval: RECORDER_INTERVAL_MS },
  });
  useEffect(() => {
    if (!transcriber) {
      return;
    }
    let cancelled = false;
    // Clear `recording` if `open()` rejects (e.g. mic permission denied) so the toolbar does not
    // report "stop" forever while nothing is captured.
    void transcriber.open().then(
      () => {
        if (!cancelled && recording) {
          transcriber.startChunksRecording();
        }
      },
      (err) => {
        if (!cancelled) {
          log.catch(err);
          setSession(() => null);
        }
      },
    );
    return () => {
      cancelled = true;
      transcriber.stopChunksRecording();
    };
  }, [transcriber, recording, setSession]);

  return null;
};

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(Capabilities.ReactContext, {
      id: meta.profile.key,
      context: ({ children }) => (
        <Fragment>
          {children}
          <TranscriptionDriver />
        </Fragment>
      ),
    });
  }),
);
