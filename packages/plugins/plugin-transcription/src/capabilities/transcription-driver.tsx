//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { useAtomCapability, useAtomCapabilityState, useCapabilities } from '@dxos/app-framework/ui';
import { log } from '@dxos/log';
import { MarkdownCapabilities } from '@dxos/plugin-markdown/types';
import { useAudioTrack } from '@dxos/react-ui-transcription';
import { linkEntities } from '@dxos/transcription-pipeline';
import { type ContentBlock } from '@dxos/types';
import { PendingTextStreamer, cancelPendingText, editorPendingTextSink, pendingTextState } from '@dxos/ui-editor';

import { useTranscriber } from '#hooks';
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

  const [, setStatus] = useAtomCapabilityState(TranscriptionCapabilities.PipelineStatus);

  const recording = session?.recording ?? false;
  const liveSessionId = session?.id;

  // Only this driver's editor-backed sessions are captured here: if no editor view is registered for
  // the session there is nowhere to stream transcription, so the driver stays idle and leaves the
  // mic to whoever owns that session (e.g. a non-editor consumer running its own transcriber).
  const hasEditorForSession = !!(liveSessionId && editorViews?.get(liveSessionId));

  // Lifecycle phase. Driven from `recording` via an effect (not derived synchronously) so that when
  // the mic switches off the phase is still 'recording' for that commit — nothing tears down until
  // the drain finishes and sets 'idle'. This lets the final transcription + enrichment complete.
  const [phase, setPhase] = useState<'idle' | 'recording' | 'draining'>('idle');
  const active = phase !== 'idle';

  // The toolbar clears the RecordingSession on stop, but the driver must keep targeting the same
  // editor through the drain — capture the session id for the lifetime of the active phase (the
  // editor stays open). Cleared once the phase returns to idle.
  const [sessionId, setSessionId] = useState<string>();
  useEffect(() => {
    if (recording && liveSessionId && hasEditorForSession) {
      setSessionId(liveSessionId);
    }
  }, [recording, liveSessionId, hasEditorForSession]);

  useEffect(() => {
    setPhase((current) =>
      recording && hasEditorForSession ? 'recording' : current === 'recording' ? 'draining' : current,
    );
  }, [recording, hasEditorForSession]);

  useEffect(() => {
    if (phase === 'idle') {
      setSessionId(undefined);
    }
  }, [phase]);

  // Publish the phase so the toolbar / testbench can reflect mic + pipeline state in real time.
  useEffect(() => {
    setStatus(() => ({ phase }));
  }, [phase, setStatus]);

  // `ideal` (not `exact`) so an unavailable device falls back to the default rather than failing.
  const audioConstraints = useMemo<MediaTrackConstraints | undefined>(
    () => (settings?.audioDeviceId ? { deviceId: { ideal: settings.audioDeviceId } } : undefined),
    [settings?.audioDeviceId],
  );

  // Keep the track (and thus the transcriber) alive across the whole active session — including the
  // drain — so the transcriber can flush its buffered audio before teardown. Released at idle. The
  // mic indicator therefore lingers for the brief drain after stop.
  const track = useAudioTrack(active, audioConstraints);

  // Refs so `handleSegments` stays stable (changing it would recreate the transcriber).
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;
  const editorViewsRef = useRef(editorViews);
  editorViewsRef.current = editorViews;

  // The user cancelled (✕) if the pending decoration was cleared mid-session; guards against
  // resurrecting it with late transcription / post-process writes during the drain.
  const isCancelled = useCallback(() => {
    const id = sessionIdRef.current;
    const view = id ? editorViewsRef.current?.get(id)?.view : undefined;
    return view ? view.state.field(pendingTextState, false) == null : false;
  }, []);

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

  const handleSegments = useCallback(
    async (segments: ContentBlock.Transcript[]) => {
      const text = segments
        .map((segment) => segment.text)
        .join(' ')
        .trim();
      if (text.length > 0 && !isCancelled()) {
        streamerRef.current?.push(text);
      }
    },
    [isCancelled],
  );

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

  // Stable identity: a fresh object would change useTranscriber's memo deps every render, recreating
  // (and reopening) the transcriber and discarding its buffered audio.
  const recorderConfig = useMemo(() => ({ interval: RECORDER_INTERVAL_MS }), []);
  const transcriber = useTranscriber({
    audioStreamTrack: track,
    onSegments: handleSegments,
    transcriberConfig,
    recorderConfig,
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
    // Hard-abort the in-flight transcription request if the user cancels (✕) during the drain.
    const abortTimer = setInterval(() => {
      if (isCancelled()) {
        transcriberRef.current?.abort();
      }
    }, 150);
    void (async () => {
      try {
        // Flush buffered audio (final transcription) then settle the streamer's post-process, unless
        // the user cancelled (✕) — in which case skip the writes so the decoration stays cleared.
        await transcriberRef.current?.flush();
        if (!isCancelled()) {
          await streamerRef.current?.flush();
        }
      } catch (err) {
        log.catch(err);
      } finally {
        clearInterval(abortTimer);
        if (!cancelled) {
          setPhase((current) => (current === 'draining' ? 'idle' : current));
        }
      }
    })();
    return () => {
      cancelled = true;
      clearInterval(abortTimer);
    };
  }, [phase, isCancelled]);

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
