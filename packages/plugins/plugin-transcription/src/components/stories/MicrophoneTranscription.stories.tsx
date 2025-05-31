//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { Events, IntentPlugin, SettingsPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { AIServiceEdgeClient } from '@dxos/assistant';
import { AI_SERVICE_ENDPOINT } from '@dxos/assistant/testing';
import { Filter, MemoryQueue } from '@dxos/echo-db';
import { create, createQueueDxn } from '@dxos/echo-schema';
import { log } from '@dxos/log';
import { ClientPlugin } from '@dxos/plugin-client';
import { PreviewPlugin } from '@dxos/plugin-preview';
import { SpacePlugin } from '@dxos/plugin-space';
import { StorybookLayoutPlugin } from '@dxos/plugin-storybook-layout';
import { ThemePlugin } from '@dxos/plugin-theme';
import { useSpace } from '@dxos/react-client/echo';
import { defaultTx } from '@dxos/react-ui-theme';
import { DataType } from '@dxos/schema';
import { seedTestData, Testing } from '@dxos/schema/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { TranscriptionStory } from './TranscriptionStory';
import { useIsSpeaking } from './useIsSpeaking';
import { TranscriptionPlugin } from '../../TranscriptionPlugin';
import { processTranscriptMessage } from '../../entity-extraction';
import { useAudioTrack, useQueueModelAdapter, useTranscriber } from '../../hooks';
import { TestItem } from '../../testing';
import { type MediaStreamRecorderParams, type TranscriberParams } from '../../transcriber';
import { renderMarkdown } from '../Transcript';

const aiService = new AIServiceEdgeClient({
  endpoint: AI_SERVICE_ENDPOINT.REMOTE,
});

const MicrophoneStory = ({
  detectSpeaking,
  entityExtraction,
  transcriberConfig,
  recorderConfig,
  audioConstraints,
}: {
  detectSpeaking?: boolean;
  entityExtraction?: boolean;
  transcriberConfig: TranscriberParams['config'];
  recorderConfig: MediaStreamRecorderParams['config'];
  audioConstraints?: MediaTrackConstraints;
}) => {
  const [running, setRunning] = useState(false);

  // Audio.
  const track = useAudioTrack(running, audioConstraints);
  // Speaking.
  const isSpeaking = detectSpeaking ? useIsSpeaking(track) : true;

  // Queue.
  const queueDxn = useMemo(() => createQueueDxn(), []);
  const queue = useMemo(() => new MemoryQueue<DataType.Message>(queueDxn), [queueDxn]);
  const model = useQueueModelAdapter(renderMarkdown([]), queue);
  const space = useSpace();

  // Transcriber.
  const handleSegments = useCallback<TranscriberParams['onSegments']>(
    async (blocks) => {
      const message = create(DataType.Message, { sender: { name: 'You' }, created: new Date().toISOString(), blocks });

      if (entityExtraction) {
        if (!space) {
          log.warn('no space');
          return;
        }
        // TODO(dmaretskyi): Move to vector search index.
        const { objects } = await space.db
          .query(
            Filter.or(
              Filter.type(DataType.Person),
              Filter.type(DataType.Organization),
              Filter.type(Testing.DocumentType),
            ),
          )
          .run();

        log.info('context', { objects });

        const result = await processTranscriptMessage({
          message,
          aiService,
          context: {
            objects,
          },
          options: {
            fallbackToRaw: true,
          },
        });
        void queue.append([result.message]);
      } else {
        void queue.append([message]);
      }
    },
    [queue, space],
  );

  const transcriber = useTranscriber({
    audioStreamTrack: track,
    onSegments: handleSegments,
    transcriberConfig,
    recorderConfig,
  });
  const [isOpen, setIsOpen] = useState(false);
  useEffect(() => {
    void transcriber?.open().then(() => setIsOpen(true));
    return () => {
      void transcriber?.close().then(() => setIsOpen(false));
    };
  }, [transcriber]);

  // Manage transcription state.
  useEffect(() => {
    if (running && transcriber?.isOpen && isSpeaking) {
      transcriber?.startChunksRecording();
    } else if (!running || !isSpeaking) {
      transcriber?.stopChunksRecording();
    }
  }, [transcriber, running, isOpen, isSpeaking]);

  return <TranscriptionStory model={model} running={running} onRunningChange={setRunning} />;
};

const meta: Meta<typeof MicrophoneStory> = {
  title: 'plugins/plugin-transcription/MicrophoneTranscription',
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

export const Default: StoryObj<typeof MicrophoneStory> = {
  render: MicrophoneStory,
  args: {
    detectSpeaking: false,
    entityExtraction: false,
    transcriberConfig: TRANSCRIBER_CONFIG,
    recorderConfig: RECORDER_CONFIG,
    audioConstraints: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    },
  },
};

export const EntityExtraction: StoryObj<typeof MicrophoneStory> = {
  render: MicrophoneStory,
  args: {
    detectSpeaking: false,
    entityExtraction: true,
    transcriberConfig: TRANSCRIBER_CONFIG,
    recorderConfig: RECORDER_CONFIG,
    audioConstraints: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    },
  },
};

export const SpeechDetection: StoryObj<typeof MicrophoneStory> = {
  render: MicrophoneStory,
  args: {
    detectSpeaking: true,
    transcriberConfig: TRANSCRIBER_CONFIG,
    recorderConfig: RECORDER_CONFIG,
    audioConstraints: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  },
};
