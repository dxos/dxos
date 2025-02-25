//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';
import React, { useRef } from 'react';

import { DXN } from '@dxos/keys';
import { log } from '@dxos/log';
import { Config } from '@dxos/react-client';
import { withClientProvider } from '@dxos/react-client/testing';
import { useEdgeClient, useQueue } from '@dxos/react-edge-client';
import { IconButton, useAsyncEffect } from '@dxos/react-ui';
import { ScrollContainer } from '@dxos/react-ui-components';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { Transcription } from './Transcription';
import { useIsSpeaking, useTranscription } from '../../hooks';
import { type TranscriptBlock } from '../../types';
import { randomQueueDxn } from '../../utils';

// Load the audio file during module initialization
const audioUrl = 'https://dxos.network/test.wav';

const createMediaStreamFromBlob = async (
  blob: Blob,
): Promise<{ stream: MediaStream; audio: HTMLAudioElement; track: MediaStreamTrack }> => {
  // Create a URL from the blob
  const url = URL.createObjectURL(blob);
  log.info('Created object URL from blob', { url });

  const audio = new Audio();
  audio.src = url;

  await new Promise((resolve) => {
    log.info('Waiting for audio to be ready');
    audio.addEventListener('canplay', resolve, { once: true });
    audio.load();
  });

  const audioContext = new AudioContext();
  const sourceNode = audioContext.createMediaElementSource(audio);
  const destinationNode = audioContext.createMediaStreamDestination();
  destinationNode.channelCount = 1;
  sourceNode.connect(destinationNode);

  // Clean up the URL when the audio is loaded
  URL.revokeObjectURL(url);

  return {
    stream: destinationNode.stream,
    track: destinationNode.stream.getAudioTracks()[0],
    audio,
  };
};

const Render = ({ queueDxn }: { queueDxn: string }) => {
  //
  // Download the audio file.
  //
  const audioBlob = useRef<Blob>();
  useAsyncEffect(async () => {
    const response = await fetch(audioUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch audio: ${response.status} ${response.statusText}`);
    }
    audioBlob.current = await response.blob();
  }, []);

  //
  // Create the audio stream.
  //
  const audioStream = useRef<{ stream: MediaStream; audio: HTMLAudioElement; track: MediaStreamTrack }>();
  const audioElement = useRef<HTMLAudioElement>();
  const handleAudioReset = async () => {
    if (!audioBlob.current) {
      return;
    }

    audioStream.current = await createMediaStreamFromBlob(audioBlob.current);
    audioElement.current!.srcObject = audioStream.current.stream;
    audioElement.current!.autoplay = true;
  };
  useAsyncEffect(async () => {
    audioElement.current = document.createElement('audio');
    await handleAudioReset();
    document.body.appendChild(audioElement.current);
  }, [audioBlob.current]);

  //
  // Create the transcription queue.
  //
  const echoClient = useEdgeClient();
  const queue = useQueue<TranscriptBlock>(echoClient, DXN.parse(queueDxn), { pollInterval: 200 });
  const isSpeaking = useIsSpeaking(audioStream.current?.track);
  useTranscription({
    transcription: { enabled: true, objectDxn: queueDxn },
    author: 'Healthy work-life balance',
    audioStreamTrack: audioStream.current?.track,
    isSpeaking,
  });

  return (
    <div className='flex flex-col gap-4'>
      <ScrollContainer>
        <Transcription blocks={queue?.items} />
      </ScrollContainer>
      <IconButton
        onClick={() => {
          audioStream.current?.audio.paused ? audioStream.current?.audio.play() : audioStream.current?.audio.pause();
        }}
        label='Play/Pause'
        icon={audioStream.current?.audio.paused ? 'ph--play--regular' : 'ph--pause--regular'}
      />
      <IconButton onClick={async () => handleAudioReset()} label='Reset' icon={'ph--arrow-clockwise--regular'} />
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
    queueDxn: randomQueueDxn().toString(),
  },
};
