//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { useAtomCapability, useAtomCapabilityState, useCapabilities } from '@dxos/app-framework/ui';
import { log } from '@dxos/log';
import { MarkdownCapabilities } from '@dxos/plugin-markdown/types';
import { linkEntities } from '@dxos/transcription-pipeline';
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
  // Injected entity resolver (full-text/vector/…); the driver stays decoupled from the database.
  const [lookup] = useCapabilities(TranscriptionCapabilities.EntityLookup);
  const settings = useAtomCapability(TranscriptionCapabilities.Settings);

  const recording = session?.recording ?? false;
  const sessionId = session?.id;

  // Lifecycle phase. Driven from `recording` via an effect (not derived synchronously) so that when
  // the mic switches off the phase is still 'recording' for that commit — nothing tears down until
  // the drain finishes and sets 'idle'. This lets the final transcription + enrichment complete.
  const [phase, setPhase] = useState<'idle' | 'recording' | 'draining'>('idle');
  const active = phase !== 'idle';
  // Keep the track (and thus the transcriber) alive across the drain — releasing it would close the
  // transcriber before it can flush its buffered audio. Released only when the phase returns to idle.
  const track = useAudioTrack(active);

  useEffect(() => {
    setPhase((current) => (recording ? 'recording' : current === 'recording' ? 'draining' : current));
  }, [recording]);

  // Streams transcribed text into the editor's pending-text block (buffering + word-by-word reveal).
  // Kept alive across the whole session (incl. drain); disposed only when the phase returns to idle.
  const streamerRef = useRef<PendingTextStreamer | null>(null);

  useEffect(() => {
    if (!active || !editorViews || !sessionId) {
      return;
    }
    const entry = editorViews.get(sessionId);
    if (!entry) {
      return;
    }

    // Clicking the toolbar blurs the editor and hides the caret, so anchor + placeholder give
    // immediate feedback while the first transcription is buffered.
    // When entity extraction is enabled and a lookup is available, rewrite settled text with inline
    // `[noun](echo:/<id>)` links — decorated as dx-anchors by the markdown editor's preview extension.
    const entityExtraction = settings?.entityExtraction !== false;
    const streamer = new PendingTextStreamer(editorPendingTextSink(entry.view), {
      mode: settings?.streamMode ?? 'word',
      wordIntervalMs: settings?.wordIntervalMs ?? 80,
      postProcess: entityExtraction && lookup ? (text) => linkEntities(text, lookup) : undefined,
    });
    streamer.start({ anchor: entry.view.state.selection.main.head, placeholder: 'Recording…' });
    streamerRef.current = streamer;

    return () => {
      streamer.dispose();
      streamerRef.current = null;
      // On teardown, drop the placeholder if nothing was transcribed; otherwise leave it for review.
      const current = editorViews.get(sessionId);
      const pending = current?.view.state.field(pendingTextState, false);
      if (current && pending && pending.final.length === 0) {
        current.view.dispatch({ effects: cancelPendingText.of() });
      }
    };
  }, [
    active,
    sessionId,
    editorViews,
    lookup,
    settings?.streamMode,
    settings?.wordIntervalMs,
    settings?.entityExtraction,
  ]);

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
  const transcriberRef = useRef(transcriber);
  transcriberRef.current = transcriber;

  useEffect(() => {
    if (!transcriber) {
      return;
    }
    let cancelled = false;
    // Clear the session if `open()` rejects (e.g. mic permission denied) so the toolbar does not
    // report "stop" forever while nothing is captured.
    void transcriber.open().then(
      () => {
        if (!cancelled && phase === 'recording') {
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
    };
  }, [transcriber, phase, setSession]);

  // Drain on stop: flush buffered audio (final transcription) and the streamer's post-process
  // (entity linking) before tearing down — so the tail of speech and its enrichment are not lost.
  useEffect(() => {
    if (phase !== 'draining') {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        await transcriberRef.current?.flush();
        await streamerRef.current?.flush();
      } catch (err) {
        log.catch(err);
      } finally {
        if (!cancelled) {
          setPhase((current) => (current === 'draining' ? 'idle' : current));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [phase]);

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
