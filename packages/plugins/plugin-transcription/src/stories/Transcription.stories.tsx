//
// Copyright 2026 DXOS.org
//

/**
 * Streaming file transcription into a message list. Loads an audio file and streams its transcript
 * through the recording engine (Transcriber → runLivePipeline → correction stage) **as it plays** —
 * appending each corrected block as a message rather than waiting for playback to stop.
 *
 * - `Default` plays a hosted m4a; the play/pause + upload toolbar gates playback and capture.
 * - `Live` transcribes the file through RealtimeKit on the dev EDGE, which needs a network and an identity with an
 *   account; elsewhere a scripted transcript stands in, so the pipeline and the message list still run offline.
 */

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { type CommitFn, makeCorrectionStage } from '@dxos/pipeline-transcription';
import { createScriptedTranscriber } from '@dxos/pipeline-transcription/testing';
import { useJoinTranscription } from '@dxos/react-client';
import {
  type TrackTranscriber,
  Transcription,
  createRealtimeKitTranscriber,
  useAudioFile,
  useFeedModelAdapter,
  useRecordingPipeline,
} from '@dxos/react-ui-transcription';
import * as Button from '@dxos/react-ui/Button';
import * as Panel from '@dxos/react-ui/Panel';
import * as ScrollContainer from '@dxos/react-ui/ScrollContainer';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import { type ContentBlock, Message } from '@dxos/types';

import { createStoryDecorators } from '#testing';

import { renderByline } from '../util/index.ts';

/** Stands in for the file's words offline; punctuated, since the sentence buffer holds text until a sentence ends. */
const SCRIPTED_TRANSCRIPT = [
  'London is one of the busiest cities in Europe.',
  'Millions of people travel into the centre every day,',
  'most of them by underground train or by bus.',
  'The city has hundreds of parks and green spaces.',
  'You can hear more than three hundred languages on its streets.',
  'Many people say that variety is the best thing about living here.',
].map((text) => ({ text }));

const SCRIPTED_TRANSCRIBER: TrackTranscriber = () => createScriptedTranscriber({ segments: SCRIPTED_TRANSCRIPT });

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
  const join = useJoinTranscription();
  const transcriber = useMemo<TrackTranscriber>(
    () => (join ? (track) => createRealtimeKitTranscriber({ audioStreamTrack: track, join }) : SCRIPTED_TRANSCRIBER),
    [join],
  );
  useRecordingPipeline({
    transcriber,
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
        <Panel.Header>
          <Toolbar.Root>
            <Button.Root
              iconOnly
              disabled={!stream}
              icon={running ? 'ph--pause--regular' : 'ph--play--regular'}
              label={running ? 'Pause' : 'Play'}
              onClick={() => setRunning((value) => !value)}
            />
            <input ref={fileInputRef} type='file' accept='audio/*' className='hidden' onChange={handleFileChange} />
            <Button.Root
              iconOnly
              icon='ph--upload--regular'
              label='Upload audio'
              onClick={() => fileInputRef.current?.click()}
            />
          </Toolbar.Root>
        </Panel.Header>
        <ScrollContainer.Root pin>
          <Panel.Body asChild>
            <ScrollContainer.Content>
              <ScrollContainer.Viewport>
                <Transcription model={model} />
              </ScrollContainer.Viewport>
            </ScrollContainer.Content>
          </Panel.Body>
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
    audioUrl: 'https://media.dxos.network/audio-london.m4a',
  },
};

export const Live: Story = {
  args: {
    audioUrl: 'https://media.dxos.network/audio-london.m4a',
  },
  parameters: { edgeUrl: 'https://dev.dxos.network/' },
};
