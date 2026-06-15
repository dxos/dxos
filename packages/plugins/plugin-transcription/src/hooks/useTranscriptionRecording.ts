//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';
import { useCallback, useEffect, useState } from 'react';

import { createFeedServiceLayer } from '@dxos/client/echo';
import { Feed, Obj } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { log } from '@dxos/log';
import { getSpace } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { Message, type Transcript } from '@dxos/types';

import { useAudioTrack } from './useAudioTrack';
import { useTranscriber } from './useTranscriber';

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

  // Append a transcribed message batch to the transcript's feed.
  const handleSegments = useCallback(
    async (blocks: Message.Message['blocks']) => {
      if (!space || !feed || blocks.length === 0) {
        return;
      }
      const sender = identity ? { identityDid: identity.did, name: identity.profile?.displayName } : {};
      const message = Obj.make(Message.Message, {
        sender,
        created: new Date().toISOString(),
        blocks,
      });
      const feedServiceLayer = createFeedServiceLayer(space.queues);
      await Feed.append(feed, [message]).pipe(Effect.provide(feedServiceLayer), EffectEx.runAndForwardErrors);
    },
    [space, feed, identity],
  );

  // Drive the transcriber lifecycle off the recording flag + audio track.
  const transcriber = useTranscriber({ audioStreamTrack: track, onSegments: handleSegments });
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
