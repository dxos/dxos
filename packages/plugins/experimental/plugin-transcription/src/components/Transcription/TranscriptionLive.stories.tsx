//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';
import React, { useEffect, useRef, useState } from 'react';

import { type DXN } from '@dxos/keys';
import { log } from '@dxos/log';
import { Config } from '@dxos/react-client';
import { withClientProvider } from '@dxos/react-client/testing';
import { useEdgeClient, useQueue } from '@dxos/react-edge-client';
import { IconButton, Toolbar } from '@dxos/react-ui';
import { ScrollContainer } from '@dxos/react-ui-components';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { Transcription } from './Transcription';
import { useAudio } from './testing';
import { useIsSpeaking, useTranscription } from '../../hooks';
import { type TranscriptBlock } from '../../types';
import { randomQueueDxn } from '../../util';

const Render = ({ queueDxn, audioUrl }: { queueDxn: DXN; audioUrl: string; transcriptUrl: string }) => {
  const audioElement = useRef<HTMLAudioElement>(null);
  const { stream, track, audio } = useAudio(audioUrl);
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

  // Start transcription.
  const echoClient = useEdgeClient();
  // It sometimes do not start transcription.
  const isSpeaking = useIsSpeaking(track);
  useTranscription({
    author: 'test',
    isSpeaking,
    audioStreamTrack: track,
    transcription: { enabled: true, objectDxn: queueDxn.toString() },
  });

  // Create the transcription queue.
  const queue = useQueue<TranscriptBlock>(echoClient, queueDxn, { pollInterval: 500 });

  return (
    <div className='flex flex-col w-[400px]'>
      <audio ref={audioElement} autoPlay />
      <Toolbar.Root>
        <IconButton
          icon={playing ? 'ph--pause--regular' : 'ph--play--regular'}
          iconOnly
          label='Pause'
          onClick={() => setPlaying((playing) => !playing)}
        />
      </Toolbar.Root>
      <ScrollContainer>
        <Transcription blocks={queue?.items} />
      </ScrollContainer>
    </div>
  );
};

const meta: Meta<typeof Render> = {
  title: 'plugins/plugin-calls/TranscriptionLive',
  render: Render,
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

type Story = StoryObj<typeof Render>;

export const Default: Story = {
  args: {
    queueDxn: randomQueueDxn(),
    // https://learnenglish.britishcouncil.org/general-english/audio-zone/living-london
    audioUrl: 'https://dxos.network/audio-london.m4a',
    transcriptUrl: 'https://dxos.network/audio-london.txt',
  },
};
