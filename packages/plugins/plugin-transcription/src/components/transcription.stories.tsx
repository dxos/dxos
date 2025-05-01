//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react';
import React, {
  type Dispatch,
  type FC,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { create } from '@dxos/echo-schema';
import { type DXN } from '@dxos/keys';
import { log } from '@dxos/log';
import { Config } from '@dxos/react-client';
import { randomQueueDxn, useQueue } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { IconButton, Toolbar } from '@dxos/react-ui';
import { ScrollContainer } from '@dxos/react-ui-components';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { renderMarkdown, Transcript } from './Transcript';
import { useAudioFile, useAudioTrack, useQueueModelAdapter, useTranscriber } from '../hooks';
import { type BlockModel } from '../model';
import { type TranscriberParams } from '../transcriber';
import { TranscriptBlock } from '../types';

const TranscriptionStory: FC<{
  model: BlockModel<TranscriptBlock>;
  running: boolean;
  onRunningChange: Dispatch<SetStateAction<boolean>>;
}> = ({ model, running, onRunningChange }) => {
  return (
    <div className='flex flex-col w-[30rem]'>
      <Toolbar.Root>
        <IconButton
          iconOnly
          icon={running ? 'ph--pause--regular' : 'ph--play--regular'}
          label={running ? 'Pause' : 'Play'}
          onClick={() => onRunningChange((running) => !running)}
        />
      </Toolbar.Root>
      <ScrollContainer>
        <Transcript model={model} attendableId='story' />
      </ScrollContainer>
    </div>
  );
};

const Microphone = () => {
  const [running, setRunning] = useState(false);

  // Audio.
  const track = useAudioTrack(running);

  // Queue.
  const queueDxn = useMemo(() => randomQueueDxn(), []);
  const queue = useQueue<TranscriptBlock>(queueDxn, { pollInterval: 500 });
  const model = useQueueModelAdapter(renderMarkdown, queue);

  // Transcriber.
  const handleSegments = useCallback<TranscriberParams['onSegments']>(
    async (segments) => {
      const block = create(TranscriptBlock, { segments });
      queue?.append([block]);
    },
    [queue],
  );
  const transcriber = useTranscriber({ audioStreamTrack: track, onSegments: handleSegments });
  useEffect(() => {
    void transcriber?.open();
    return () => {
      void transcriber?.close();
    };
  }, [transcriber]);

  // Manage transcription state.
  useEffect(() => {
    if (running && transcriber?.isOpen) {
      void transcriber?.startChunksRecording();
    } else if (!running) {
      void transcriber?.stopChunksRecording();
    }
  }, [transcriber, running, transcriber?.isOpen]);

  return <TranscriptionStory model={model} running={running} onRunningChange={setRunning} />;
};

const AudioFile = ({ queueDxn, audioUrl }: { queueDxn: DXN; audioUrl: string; transcriptUrl: string }) => {
  const [running, setRunning] = useState(false);

  // Audio.
  const audioElement = useRef<HTMLAudioElement>(null);
  const { audio, stream, track } = useAudioFile(audioUrl);
  useEffect(() => {
    if (stream && audioElement.current) {
      audioElement.current.srcObject = stream;
    }
  }, [stream, audioElement.current]);

  useEffect(() => {
    if (!audio) {
      log.warn('no audio');
      return;
    }

    if (running) {
      void audio.play();
    } else {
      void audio.pause();
    }
  }, [audio, running]);

  // Transcriber.
  const queue = useQueue<TranscriptBlock>(queueDxn, { pollInterval: 500 });
  const model = useQueueModelAdapter(renderMarkdown, queue);
  const handleSegments = useCallback<TranscriberParams['onSegments']>(
    async (segments) => {
      const block = create(TranscriptBlock, { authorName: 'test', authorHue: 'cyan', segments });
      queue?.append([block]);
    },
    [queue],
  );

  const transcriber = useTranscriber({
    audioStreamTrack: track,
    onSegments: handleSegments,
  });

  useEffect(() => {
    if (transcriber && running) {
      void transcriber.open();
    } else if (!running) {
      transcriber?.stopChunksRecording();
      void transcriber?.close();
    }
  }, [transcriber, running]);

  useEffect(() => {
    if (track?.readyState === 'live' && transcriber?.isOpen) {
      log.info('starting transcription');
      transcriber.startChunksRecording();
    } else if (track?.readyState !== 'live' && transcriber) {
      log.info('stopping transcription');
      transcriber.stopChunksRecording();
    }
  }, [transcriber, track?.readyState, transcriber?.isOpen]);

  return <TranscriptionStory model={model} running={running} onRunningChange={setRunning} />;
};

const meta: Meta<typeof AudioFile> = {
  title: 'plugins/plugin-transcription/transcription',
  decorators: [
    withClientProvider({
      config: new Config({
        runtime: {
          client: { edgeFeatures: { signaling: true } },
          services: {
            edge: { url: 'https://edge.dxos.workers.dev/' },
            iceProviders: [{ urls: 'https://edge.dxos.workers.dev/ice' }],
          },
        },
      }),
    }),
    withTheme,
    withLayout({
      tooltips: true,
      fullscreen: true,
      classNames: 'justify-center',
    }),
  ],
};

export default meta;

type Story = StoryObj<typeof AudioFile>;

export const Default: Story = {
  render: Microphone,
};

export const File: Story = {
  render: AudioFile,
  args: {
    queueDxn: randomQueueDxn(),
    // https://learnenglish.britishcouncil.org/general-english/audio-zone/living-london
    transcriptUrl: 'https://dxos.network/audio-london.txt',
    audioUrl: 'https://dxos.network/audio-london.m4a',
  },
};
