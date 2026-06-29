//
// Copyright 2026 DXOS.org
//

/**
 * Streaming file transcription into a message list. Loads an audio file and streams its transcript
 * through the recording engine (Transcriber → runLivePipeline → correction stage) **as it plays** —
 * appending each corrected block as a message rather than waiting for playback to stop.
 *
 * - `Default` plays a hosted m4a; the play/pause + upload toolbar gates playback and capture.
 * - A small chunk threshold drives incremental transcription every few seconds (the streaming stack).
 */

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { IconButton, Panel, ScrollContainer, Toolbar } from '@dxos/react-ui';
import {
  Transcription,
  renderByline,
  useAudioFile,
  useFeedModelAdapter,
  useRecordingPipeline,
} from '@dxos/react-ui-transcription';
import { type CommitFn, type TranscribeConfig, makeCorrectionStage } from '@dxos/transcription-pipeline';
import { type ContentBlock, Message } from '@dxos/types';

import { createStoryDecorators } from '../testing';

// Small chunk threshold so the transcriber emits every few seconds while the file plays (streaming),
// instead of only flushing the whole buffer on stop.
const STREAMING_TRANSCRIBE_CONFIG: Partial<TranscribeConfig> = {
  transcribeAfterChunksAmount: 25,
  prefixBufferChunksAmount: 10,
};

// In-memory message buffer + model adapter (production wires up a real space-backed `Feed`).
const useStoryMessageModel = () => {
  const [messages, setMessages] = useState<Message.Message[]>([]);
  const appendMessage = useCallback((message: Message.Message) => setMessages((prev) => [...prev, message]), []);
  const model = useFeedModelAdapter(renderByline([]), messages);
  return { model, appendMessage };
};

type StoryArgs = {
  audioUrl: string;
  audioConstraints?: MediaTrackConstraints;
};

const DefaultStory = ({ audioUrl, audioConstraints }: StoryArgs) => {
  // Decode the file/URL into a track; a play/pause button gates playback + capture.
  const [running, setRunning] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string>();
  useEffect(() => {
    return () => {
      if (uploadedUrl) {
        URL.revokeObjectURL(uploadedUrl);
      }
    };
  }, [uploadedUrl]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setRunning(false);
      setUploadedUrl(URL.createObjectURL(file));
    }
    // Reset so the same file can be re-selected.
    event.target.value = '';
  }, []);
  const { audio, stream, track } = useAudioFile(uploadedUrl ?? audioUrl, audioConstraints);

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
    config: STREAMING_TRANSCRIBE_CONFIG,
    segmentSentences: true,
    active: running,
    track,
    stages,
    commit,
  });

  return (
    <>
      <audio ref={audioRef} autoPlay />
      <Panel.Root>
        <Panel.Toolbar asChild>
          <Toolbar.Root>
            <IconButton
              iconOnly
              disabled={!stream}
              icon={running ? 'ph--pause--regular' : 'ph--play--regular'}
              label={running ? 'Pause' : 'Play'}
              onClick={() => setRunning((value) => !value)}
            />
            <input ref={fileInputRef} type='file' accept='audio/*' className='hidden' onChange={handleFileChange} />
            <IconButton
              iconOnly
              icon='ph--upload--regular'
              label='Upload audio'
              onClick={() => fileInputRef.current?.click()}
            />
          </Toolbar.Root>
        </Panel.Toolbar>
        <ScrollContainer.Root pin>
          <Panel.Content asChild>
            <ScrollContainer.Content>
              <ScrollContainer.Viewport>
                <Transcription model={model} />
              </ScrollContainer.Viewport>
            </ScrollContainer.Content>
          </Panel.Content>
        </ScrollContainer.Root>
      </Panel.Root>
    </>
  );
};

const meta = {
  title: 'plugins/plugin-transcription/stories/Transcription',
  render: DefaultStory,
  decorators: createStoryDecorators(),
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    // https://learnenglish.britishcouncil.org/general-english/audio-zone/living-london
    audioUrl: 'https://dxos.network/audio-london.m4a',
  },
};
