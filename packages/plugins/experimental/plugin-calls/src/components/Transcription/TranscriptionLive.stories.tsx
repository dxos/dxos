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
const audioUrl = 'https://dxos.network/test-voice.m4a';

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
  const audio = useRef<{ stream: MediaStream; audio: HTMLAudioElement; track: MediaStreamTrack }>();

  useAsyncEffect(async () => {
    if (!audio.current) {
      try {
        log.info('Fetching audio file');
        const response = await fetch(audioUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch audio: ${response.status} ${response.statusText}`);
        }

        const blob = await response.blob();
        log.info('Got audio blob', { size: blob.size, type: blob.type });

        audio.current = await createMediaStreamFromBlob(blob);

        // Add audio to the page
        const audioElement = document.createElement('audio');
        audioElement.srcObject = audio.current.stream;
        audioElement.autoplay = true;
        document.body.appendChild(audioElement);
      } catch (error) {
        log.error('Failed to load audio', { error });
      }
    }
  }, []);

  const echoClient = useEdgeClient();
  const queue = useQueue<TranscriptBlock>(echoClient, DXN.parse(queueDxn), { pollInterval: 200 });
  const isSpeaking = useIsSpeaking(audio.current?.track);
  useTranscription({
    transcription: { enabled: true, objectDxn: queueDxn },
    author: 'Healthy work-life balance',
    audioStreamTrack: audio.current?.track,
    isSpeaking,
  });

  return (
    <div className='flex flex-row gap-4 items-center'>
      <ScrollContainer>
        <Transcription blocks={queue?.items} />
      </ScrollContainer>
      <IconButton
        onClick={() => {
          audio.current?.audio.paused ? audio.current?.audio.play() : audio.current?.audio.pause();
        }}
        label='Play/Pause'
        icon={audio.current?.audio.paused ? 'ph--play--regular' : 'ph--pause--regular'}
      />
      <IconButton
        onClick={async () => {
          try {
            const response = await fetch(audioUrl);
            if (!response.ok) {
              throw new Error(`Failed to fetch audio: ${response.status} ${response.statusText}`);
            }
            const blob = await response.blob();
            audio.current = await createMediaStreamFromBlob(blob);
          } catch (error) {
            log.error('Failed to reset audio', { error });
          }
        }}
        label='Reset'
        icon={'ph--arrow-clockwise--regular'}
      />
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
