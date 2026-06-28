//
// Copyright 2026 DXOS.org
//

/**
 * Transcription into a message list — the message-list integration test, unifying the former
 * LiveTranscription and FileTranscription stories on the shared recording engine.
 *
 * - `Microphone` — live mic via the real `Mic` button (toggles the `RecordingSession`); the story
 *   observes the session and feeds the Transcriber through `runLivePipeline` (the editor driver stays
 *   idle: no editor view for this session).
 * - `File` — decodes a hosted/uploaded audio file into a track via `useAudioFile`; a play/pause +
 *   upload toolbar gates playback and capture.
 * - Both share `useRecordingPipeline`: ASR → PipelineRuntime → commit sink. The correction stage's
 *   output is appended to an in-memory model rendered by `Transcription` (one message per block).
 */

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAudioFile, useRecordingPipeline } from '@dxos/react-ui-transcription';
import { type CommitFn, type TranscribeConfig, makeCorrectionStage } from '@dxos/transcription-pipeline';
import { type ContentBlock, Message } from '@dxos/types';

import { Mic } from '#components';
import { translations } from '#translations';

import { createStoryDecorators, useRecordingSession, useStoryMessageModel } from './testing';
import { TranscriptionStory } from './TranscriptionStory';

// Stable session key for the Mic button; any non-editor id works (the editor driver ignores it).
const DOC_ID = 'transcription-story';

type StoryArgs = {
  source: 'mic' | 'file';
  audioUrl?: string;
  transcriberConfig?: Partial<TranscribeConfig>;
  audioConstraints?: MediaTrackConstraints;
};

const DefaultStory = ({ source, audioUrl = '', transcriberConfig, audioConstraints }: StoryArgs) => {
  // Mic source: the real Mic button toggles the RecordingSession; observe it to gate capture.
  const recording = useRecordingSession(DOC_ID);

  // File source: decode the file/URL into a track; a play/pause button gates playback + capture.
  const [running, setRunning] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string>();
  useEffect(() => {
    return () => {
      if (uploadedUrl) {
        URL.revokeObjectURL(uploadedUrl);
      }
    };
  }, [uploadedUrl]);
  const handleUpload = useCallback((file: File) => {
    setRunning(false);
    setUploadedUrl(URL.createObjectURL(file));
  }, []);
  const {
    audio,
    stream,
    track: fileTrack,
  } = useAudioFile(source === 'file' ? (uploadedUrl ?? audioUrl) : '', audioConstraints);

  // Pipe the decoded stream into the <audio> element so the user hears playback, mirroring `running`.
  const audioRef = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    if (audioRef.current && stream) {
      audioRef.current.srcObject = stream;
    }
  }, [stream]);
  useEffect(() => {
    if (!audio) {
      return;
    }
    if (running) {
      void audio.play();
    } else {
      audio.pause();
    }
  }, [audio, running]);

  // Append one message per committed block (keyed by block identity so re-commits don't duplicate).
  const { model, appendMessage } = useStoryMessageModel();
  const seen = useRef(new WeakSet<ContentBlock.Transcript>());
  const commit = useCallback<CommitFn>(
    (write, window) =>
      Effect.sync(() => {
        for (const update of write.blockUpdates ?? []) {
          const block = window[update.index];
          if (!block || seen.current.has(block)) {
            continue;
          }
          seen.current.add(block);
          appendMessage(
            Message.make({
              sender: { name: 'You' },
              created: new Date().toISOString(),
              blocks: [{ ...block, text: update.corrected ?? block.text }],
            }),
          );
        }
      }),
    [appendMessage],
  );

  const stages = useMemo(() => [makeCorrectionStage()], []);
  useRecordingPipeline({
    active: source === 'mic' ? recording : running,
    microphone: source === 'mic',
    track: source === 'mic' ? undefined : fileTrack,
    audioConstraints,
    stages,
    commit,
    transcribeConfig: transcriberConfig,
  });

  return source === 'mic' ? (
    <TranscriptionStory model={model} toolbar={<Mic docId={DOC_ID} />} />
  ) : (
    <TranscriptionStory
      model={model}
      audioRef={audioRef}
      disabled={!stream}
      running={running}
      onRunningChange={setRunning}
      onUpload={handleUpload}
    />
  );
};

const meta = {
  title: 'plugins/plugin-transcription/stories/Transcription',
  render: DefaultStory,
  decorators: createStoryDecorators({ enableVectorIndex: true }),
  parameters: { translations },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Live microphone capture via the real Mic button. */
export const Microphone: Story = {
  args: {
    source: 'mic',
    audioConstraints: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
  },
};

/** Transcribe a hosted audio file (or an uploaded one). */
export const File: Story = {
  args: {
    source: 'file',
    // https://learnenglish.britishcouncil.org/general-english/audio-zone/living-london
    audioUrl: 'https://dxos.network/audio-london.m4a',
    transcriberConfig: { transcribeAfterChunksAmount: 100, prefixBufferChunksAmount: 50 },
  },
};
