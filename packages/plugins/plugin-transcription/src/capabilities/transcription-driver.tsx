//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { Fragment, useCallback, useEffect, useRef } from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { useAtomCapabilityState, useCapabilities } from '@dxos/app-framework/ui';
import { log } from '@dxos/log';
import { MarkdownCapabilities } from '@dxos/plugin-markdown/types';
import { type ContentBlock } from '@dxos/types';
import { appendPendingText, setPendingAnchor } from '@dxos/ui-editor';

import { useAudioTrack, useTranscriber } from '#hooks';
import { meta } from '#meta';
import { TranscriptionCapabilities } from '#types';

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

  const recording = session?.recording ?? false;
  const sessionId = session?.id;
  const track = useAudioTrack(recording);

  // Reset the per-session anchor flag whenever a new recording starts.
  const anchorSet = useRef(false);
  useEffect(() => {
    anchorSet.current = false;
  }, [recording, sessionId]);

  const handleSegments = useCallback(
    async (segments: ContentBlock.Transcript[]) => {
      if (!editorViews || !sessionId) {
        return;
      }
      const entry = editorViews.get(sessionId);
      if (!entry) {
        return;
      }

      const text = segments
        .map((segment) => segment.text)
        .join(' ')
        .trim();
      if (text.length === 0) {
        return;
      }

      const effects = [];
      if (!anchorSet.current) {
        effects.push(setPendingAnchor.of(entry.view.state.selection.main.head));
        anchorSet.current = true;
        effects.push(appendPendingText.of(text));
      } else {
        // Separate successive batches with a single space.
        effects.push(appendPendingText.of(' ' + text));
      }
      entry.view.dispatch({ effects });
    },
    [editorViews, sessionId],
  );

  const transcriber = useTranscriber({ audioStreamTrack: track, onSegments: handleSegments });
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
