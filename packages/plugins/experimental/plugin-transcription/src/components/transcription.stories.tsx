//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { createStatic } from '@dxos/echo-schema';
import { type DXN } from '@dxos/keys';
import { log } from '@dxos/log';
import { Config } from '@dxos/react-client';
import { withClientProvider } from '@dxos/react-client/testing';
import { useEdgeClient, useQueue } from '@dxos/react-edge-client';
import { IconButton, Toolbar } from '@dxos/react-ui';
import { ScrollContainer } from '@dxos/react-ui-components';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { Transcript } from './Transcript';
import { useTranscriber, useAudioFile, useAudioTrack } from '../hooks';
import { type TranscriberParams } from '../transcriber';
import { TranscriptBlock } from '../types';
import { randomQueueDxn } from '../util';

const Microphone = () => {
  // Audio.
  const [playing, setPlaying] = useState(false);
  const track = useAudioTrack(playing);

  // Create the transcription queue.
  const queueDxn = useMemo(() => randomQueueDxn(), []);
  const echoClient = useEdgeClient();
  const queue = useQueue<TranscriptBlock>(echoClient, queueDxn, { pollInterval: 500 });
  const handleSegments = useCallback<TranscriberParams['onSegments']>(
    async (segments) => {
      const block = createStatic(TranscriptBlock, { author: 'test', segments });
      queue?.append([block]);
    },
    [queue],
  );

  // Transcriber.
  const transcriber = useTranscriber({ audioStreamTrack: track, onSegments: handleSegments });

  useEffect(() => {
    if (transcriber) {
      void transcriber.open();
    }

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

  return (
    <div className='flex flex-col w-[400px]'>
      <Toolbar.Root>
        <IconButton
          iconOnly
          icon={playing ? 'ph--pause--regular' : 'ph--play--regular'}
          label='Play'
          onClick={() => setPlaying((playing) => !playing)}
        />
      </Toolbar.Root>
      <ScrollContainer>
        <Transcript blocks={queue?.items} />
      </ScrollContainer>
    </div>
  );
};

const AudioFile = ({ queueDxn, audioUrl }: { queueDxn: DXN; audioUrl: string; transcriptUrl: string }) => {
  const audioElement = useRef<HTMLAudioElement>(null);
  const { audio, stream, track } = useAudioFile(audioUrl);
  useEffect(() => {
    if (stream && audioElement.current) {
      audioElement.current.srcObject = stream;
    }
  }, [stream, audioElement.current]);

  // Playing state.
  const [playing, setPlaying] = useState(false);
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

  // Create the transcription queue.
  const echoClient = useEdgeClient();
  const queue = useQueue<TranscriptBlock>(echoClient, queueDxn, { pollInterval: 500 });
  const handleSegments = useCallback<TranscriberParams['onSegments']>(
    async (segments) => {
      const block = createStatic(TranscriptBlock, { author: 'test', segments });
      queue?.append([block]);
    },
    [queue],
  );

  // Transcriber.
  const transcriber = useTranscriber({
    audioStreamTrack: track,
    onSegments: handleSegments,
  });

  useEffect(() => {
    if (transcriber) {
      void transcriber.open();
    }
  }, [transcriber]);

  // Manage transcription state.
  useEffect(() => {
    if (track?.readyState === 'live' && transcriber?.isOpen) {
      log.info('starting transcription');
      void transcriber.startChunksRecording();
    } else if (track?.readyState !== 'live' && transcriber) {
      log.info('stopping transcription');
      void transcriber.stopChunksRecording();
    }
  }, [transcriber, track?.readyState, transcriber?.isOpen]);

  return (
    <div className='flex flex-col w-[400px]'>
      <audio ref={audioElement} autoPlay />
      <Toolbar.Root>
        <IconButton
          iconOnly
          icon={playing ? 'ph--pause--regular' : 'ph--play--regular'}
          label='Play'
          onClick={() => setPlaying((playing) => !playing)}
        />
      </Toolbar.Root>
      <ScrollContainer>
        <Transcript blocks={queue?.items} />
      </ScrollContainer>
    </div>
  );
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
