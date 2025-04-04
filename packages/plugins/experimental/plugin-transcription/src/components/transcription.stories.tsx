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

import { createStatic } from '@dxos/echo-schema';
import { type DXN } from '@dxos/keys';
import { log } from '@dxos/log';
import { Config } from '@dxos/react-client';
import { useQueue } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { IconButton, Toolbar } from '@dxos/react-ui';
import { ScrollContainer } from '@dxos/react-ui-components';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Transcript } from './Transcript';
import { useAudioFile, useAudioTrack, useTranscriber } from '../hooks';
import { type TranscriberParams } from '../transcriber';
import { TranscriptBlock } from '../types';
import { randomQueueDxn } from '../util';

const TranscriptionStory: FC<{
  playing: boolean;
  setPlaying: Dispatch<SetStateAction<boolean>>;
  blocks?: TranscriptBlock[];
}> = ({ playing, setPlaying, blocks }) => {
  return (
    <div className='flex flex-col w-[30rem]'>
      <Toolbar.Root>
        <IconButton
          iconOnly
          icon={playing ? 'ph--pause--regular' : 'ph--play--regular'}
          label={playing ? 'Pause' : 'Play'}
          onClick={() => setPlaying((playing) => !playing)}
        />
      </Toolbar.Root>
      <ScrollContainer>
        <Transcript blocks={blocks} attendableId='story' />
      </ScrollContainer>
    </div>
  );
};

const Microphone = () => {
  const [playing, setPlaying] = useState(false);

  // Audio.
  const track = useAudioTrack(playing);

  // Queue.
  const queueDxn = useMemo(() => randomQueueDxn(), []);
  const queue = useQueue<TranscriptBlock>(queueDxn, { pollInterval: 500 });

  // Transcriber.
  const handleSegments = useCallback<TranscriberParams['onSegments']>(
    async (segments) => {
      const block = createStatic(TranscriptBlock, { segments });
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
    if (playing && transcriber?.isOpen) {
      void transcriber?.startChunksRecording();
    } else if (!playing) {
      void transcriber?.stopChunksRecording();
    }
  }, [transcriber, playing, transcriber?.isOpen]);

  return <TranscriptionStory playing={playing} setPlaying={setPlaying} blocks={queue?.items} />;
};

const AudioFile = ({ queueDxn, audioUrl }: { queueDxn: DXN; audioUrl: string; transcriptUrl: string }) => {
  const [playing, setPlaying] = useState(false);

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

    if (playing) {
      void audio.play();
    } else {
      void audio.pause();
    }
  }, [audio, playing]);

  // Transcriber.
  const queue = useQueue<TranscriptBlock>(queueDxn, { pollInterval: 500 });
  const handleSegments = useCallback<TranscriberParams['onSegments']>(
    async (segments) => {
      const block = createStatic(TranscriptBlock, { authorName: 'test', authorHue: 'cyan', segments });
      queue?.append([block]);
    },
    [queue],
  );

  const transcriber = useTranscriber({
    audioStreamTrack: track,
    onSegments: handleSegments,
  });

  useEffect(() => {
    if (transcriber && playing) {
      void transcriber.open();
    } else if (!playing) {
      transcriber?.stopChunksRecording();
      void transcriber?.close();
    }
  }, [transcriber, playing]);

  useEffect(() => {
    if (track?.readyState === 'live' && transcriber?.isOpen) {
      log.info('starting transcription');
      transcriber.startChunksRecording();
    } else if (track?.readyState !== 'live' && transcriber) {
      log.info('stopping transcription');
      transcriber.stopChunksRecording();
    }
  }, [transcriber, track?.readyState, transcriber?.isOpen]);

  return <TranscriptionStory playing={playing} setPlaying={setPlaying} blocks={queue?.items} />;
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
