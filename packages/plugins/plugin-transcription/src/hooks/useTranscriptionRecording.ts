//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';
import { useCallback, useEffect, useState } from 'react';

import { useAtomCapability, useOperationInvoker } from '@dxos/app-framework/ui';
import { Database, Feed, Obj } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { log } from '@dxos/log';
import { getSpace } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { useAudioTrack, useEdgeTranscribe, useTranscriber } from '@dxos/react-ui-transcription';
import { Message, type Transcript } from '@dxos/types';

import { TranscriptionCapabilities, TranscriptOperation } from '#types';

export type TranscriptionRecording = {
  recording: boolean;
  toggleRecording: () => void;
};

/**
 * Drives the recording lifecycle for a transcript: opens an audio track, feeds it through the
 * transcriber, and appends transcribed message batches to the transcript's feed. Returns the
 * recording flag and a toggle callback for the caller to wire to UI.
 */
export const useTranscriptionRecording = (transcript: Transcript.Transcript): TranscriptionRecording => {
  const space = getSpace(transcript);
  const identity = useIdentity();
  const feed = transcript.feed.target;

  const [recording, setRecording] = useState(false);
  const track = useAudioTrack(recording);
  const transcribe = useEdgeTranscribe();
  const { invokePromise } = useOperationInvoker();
  const settings = useAtomCapability(TranscriptionCapabilities.Settings);

  // Append a transcribed message batch to the transcript's feed, enriching it first (when entity
  // extraction is enabled) with references to known entities mentioned in the transcript.
  const handleSegments = useCallback(
    async (blocks: Message.Message['blocks']) => {
      if (!space || !feed || blocks.length === 0) {
        return;
      }
      const sender = identity ? { identityDid: identity.did, name: identity.profile?.displayName } : {};
      let message = Obj.make(Message.Message, {
        sender,
        created: new Date().toISOString(),
        blocks,
      });

      // `spaceId` provides the space context required by the process-affinity AiService/Database.
      // Fall back to the raw message if extraction fails (e.g. AI service unavailable).
      if (settings?.entityExtraction ?? true) {
        const { data, error } = await invokePromise(
          TranscriptOperation.EnrichMessage,
          { message },
          { spaceId: space.id },
        );
        if (error) {
          log.warn('entity extraction failed; using raw transcript', { error });
        } else if (data?.message) {
          message = data.message;
        }
      }

      await Feed.append(feed, [message]).pipe(Effect.provide(Database.layer(space.db)), EffectEx.runAndForwardErrors);
    },
    [space, feed, identity, invokePromise, settings],
  );

  // Drive the transcriber lifecycle off the recording flag + audio track.
  const transcriber = useTranscriber({ audioStreamTrack: track, transcribe, onSegments: handleSegments });
  useEffect(() => {
    if (!transcriber) {
      return;
    }
    let cancelled = false;
    // If `open()` rejects (e.g. mic permission denied, device init failure) we must
    // clear `recording` — otherwise the toolbar button reports "stop" forever while
    // nothing is actually being captured.
    void transcriber.open().then(
      () => {
        if (!cancelled && recording) {
          transcriber.startChunksRecording();
        }
      },
      (err) => {
        if (!cancelled) {
          log.catch(err);
          setRecording(false);
        }
      },
    );
    return () => {
      cancelled = true;
      transcriber.stopChunksRecording();
    };
  }, [transcriber, recording]);

  const toggleRecording = useCallback(() => setRecording((value) => !value), []);

  return { recording, toggleRecording };
};
