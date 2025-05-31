//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Events, IntentPlugin, SettingsPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { MemoryQueue } from '@dxos/echo-db';
import { create, createQueueDxn } from '@dxos/echo-schema';
import { log } from '@dxos/log';
import { ClientPlugin } from '@dxos/plugin-client';
import { PreviewPlugin } from '@dxos/plugin-preview';
import { SpacePlugin } from '@dxos/plugin-space';
import { StorybookLayoutPlugin } from '@dxos/plugin-storybook-layout';
import { ThemePlugin } from '@dxos/plugin-theme';
import { defaultTx } from '@dxos/react-ui-theme';
import { DataType } from '@dxos/schema';
import { seedTestData, Testing } from '@dxos/schema/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { TranscriptionStory } from './TranscriptionStory';
import { useIsSpeaking } from './useIsSpeaking';
import { TranscriptionPlugin } from '../../TranscriptionPlugin';
import { useAudioFile, useQueueModelAdapter, useTranscriber } from '../../hooks';
import { TestItem } from '../../testing';
import { type MediaStreamRecorderParams, type TranscriberParams } from '../../transcriber';
import { renderMarkdown } from '../Transcript';

const AudioFile = ({
  detectSpeaking,
  audioUrl,
  transcriberConfig,
  recorderConfig,
  audioConstraints,
}: {
  detectSpeaking?: boolean;
  audioUrl: string;
  transcriberConfig?: TranscriberParams['config'];
  recorderConfig?: MediaStreamRecorderParams['config'];
  audioConstraints?: MediaTrackConstraints;
}) => {
  const [running, setRunning] = useState(false);

  // Audio.
  const { audio, track, stream } = useAudioFile(audioUrl, audioConstraints);
  // Speaking.
  const isSpeaking = detectSpeaking ? useIsSpeaking(track) : true;
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    if (ref.current && stream) {
      ref.current.srcObject = stream;
    }
  }, [stream]);

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
  const queueDxn = useMemo(() => createQueueDxn(), []);
  const queue = useMemo(() => new MemoryQueue<DataType.Message>(queueDxn), [queueDxn]);
  const model = useQueueModelAdapter(renderMarkdown([]), queue);
  const handleSegments = useCallback<TranscriberParams['onSegments']>(
    async (blocks) => {
      const message = create(DataType.Message, { sender: { name: 'You' }, created: new Date().toISOString(), blocks });
      void queue?.append([message]);
    },
    [queue],
  );

  const transcriber = useTranscriber({
    audioStreamTrack: track,
    onSegments: handleSegments,
    transcriberConfig,
    recorderConfig,
  });

  const manageChunkRecording = () => {
    if (track?.readyState === 'live' && transcriber?.isOpen && isSpeaking) {
      log.info('starting transcription');
      transcriber.startChunksRecording();
    } else if (!isSpeaking || track?.readyState !== 'live') {
      log.info('stopping transcription');
      transcriber?.stopChunksRecording();
    }
  };

  useEffect(() => {
    if (transcriber && running) {
      void transcriber.open().then(manageChunkRecording);
    } else if (!running) {
      transcriber?.stopChunksRecording();
      void transcriber?.close();
    }
  }, [transcriber, running]);

  useEffect(() => {
    manageChunkRecording();
  }, [transcriber, track?.readyState, isSpeaking]);

  return <TranscriptionStory model={model} running={running} onRunningChange={setRunning} audioRef={ref} />;
};

const meta: Meta<typeof AudioFile> = {
  title: 'plugins/plugin-transcription/FileTranscription',
  decorators: [
    withPluginManager({
      plugins: [
        ThemePlugin({ tx: defaultTx }),
        StorybookLayoutPlugin(),
        ClientPlugin({
          types: [TestItem, DataType.Person, DataType.Organization, Testing.DocumentType],
          onClientInitialized: async (_, client) => {
            await client.halo.createIdentity();
            await client.spaces.waitUntilReady();
            await client.spaces.default.waitUntilReady();
            await seedTestData(client.spaces.default);
          },
        }),
        SpacePlugin(),
        SettingsPlugin(),
        PreviewPlugin(),
        IntentPlugin(),
        TranscriptionPlugin(),
      ],
      fireEvents: [Events.SetupAppGraph],
    }),
    withTheme,
    withLayout({ fullscreen: true, classNames: 'justify-center' }),
  ],
};

export default meta;

const TRANSCRIBER_CONFIG = {
  transcribeAfterChunksAmount: 50,
  prefixBufferChunksAmount: 10,
};

const RECORDER_CONFIG = {
  interval: 200,
};

export const Default: StoryObj<typeof AudioFile> = {
  render: AudioFile,
  args: {
    // https://learnenglish.britishcouncil.org/general-english/audio-zone/living-london
    audioUrl: 'https://dxos.network/audio-london.m4a',
    transcriberConfig: TRANSCRIBER_CONFIG,
    recorderConfig: RECORDER_CONFIG,
  },
};

export const WithSpeechDetection: StoryObj<typeof AudioFile> = {
  render: AudioFile,
  args: {
    detectSpeaking: true,
    // https://learnenglish.britishcouncil.org/general-english/audio-zone/living-london
    audioUrl: 'https://dxos.network/audio-london.m4a',
    transcriberConfig: TRANSCRIBER_CONFIG,
    recorderConfig: RECORDER_CONFIG,
  },
};
