//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { EdgeAiServiceClient } from '@dxos/ai';
import { AI_SERVICE_ENDPOINT } from '@dxos/ai/testing';
import { Events, IntentPlugin, SettingsPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import {
  extractionAnthropicFn,
  type ExtractionFunction,
  extractionNerFn,
  processTranscriptMessage,
  getNer,
} from '@dxos/assistant';
import { Filter, Obj, type Type } from '@dxos/echo';
import { MemoryQueue } from '@dxos/echo-db';
import { createQueueDXN } from '@dxos/echo-schema';
import { FunctionExecutor, ServiceContainer } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { ClientPlugin } from '@dxos/plugin-client';
import { PreviewPlugin } from '@dxos/plugin-preview';
import { SpacePlugin } from '@dxos/plugin-space';
import { StorybookLayoutPlugin } from '@dxos/plugin-storybook-layout';
import { ThemePlugin } from '@dxos/plugin-theme';
import { IndexKind, useSpace } from '@dxos/react-client/echo';
import { defaultTx } from '@dxos/react-ui-theme';
import { DataType } from '@dxos/schema';
import { seedTestData, Testing } from '@dxos/schema/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { TranscriptionStory } from './TranscriptionStory';
import { useIsSpeaking } from './useIsSpeaking';
import { TranscriptionPlugin } from '../../TranscriptionPlugin';
import { useAudioTrack, useQueueModelAdapter, useTranscriber } from '../../hooks';
import { TestItem } from '../../testing';
import { type MediaStreamRecorderParams, type TranscriberParams } from '../../transcriber';
import { renderMarkdown } from '../Transcript';

const TRANSCRIBER_CONFIG = {
  transcribeAfterChunksAmount: 50,
  prefixBufferChunksAmount: 10,
};

const RECORDER_CONFIG = {
  interval: 200,
};

type StoryProps = {
  detectSpeaking?: boolean;
  transcriberConfig: TranscriberParams['config'];
  recorderConfig: MediaStreamRecorderParams['config'];
  audioConstraints?: MediaTrackConstraints;
  entityExtraction: 'none' | 'ner' | 'llm';
};

const DefaultStory = ({
  detectSpeaking,
  entityExtraction = 'none',
  transcriberConfig,
  recorderConfig,
  audioConstraints,
}: StoryProps) => {
  const [running, setRunning] = useState(false);

  // Audio.
  const track = useAudioTrack(running, audioConstraints);

  // Speaking.
  const isSpeaking = detectSpeaking ? useIsSpeaking(track) : true;

  // Queue.
  // TODO(dmaretskyi): Use space.queues.create() instead.
  const queueDxn = useMemo(() => createQueueDXN(), []);
  const queue = useMemo(() => new MemoryQueue<DataType.Message>(queueDxn), [queueDxn]);
  const model = useQueueModelAdapter(renderMarkdown([]), queue);
  const space = useSpace();

  useEffect(() => {
    if (!space) {
      log.warn('no space');
    }
  }, [space]);

  // Entity extraction.
  const { extractionFunction, executor, objects } = useMemo(() => {
    if (!space) {
      log.warn('no space');
      return {};
    }

    let executor: FunctionExecutor | undefined;
    let extractionFunction: ExtractionFunction | undefined;
    let objects: Promise<Type.Expando[]> | undefined;

    if (entityExtraction === 'ner') {
      // Init model loading. Takes time.
      void getNer();
      extractionFunction = extractionNerFn;
    } else if (entityExtraction === 'llm') {
      extractionFunction = extractionAnthropicFn;
      objects = space.db
        .query(
          Filter.or(
            Filter.type(DataType.Person),
            Filter.type(DataType.Organization),
            Filter.type(Testing.DocumentType),
          ),
        )
        .run()
        .then((result) => result.objects);
    }
    if (entityExtraction !== 'none') {
      // eslint-disable-next-line no-unused-vars
      const AiService = new EdgeAiServiceClient({
        endpoint: AI_SERVICE_ENDPOINT.REMOTE,
      });
      executor = new FunctionExecutor(
        new ServiceContainer().setServices({
          // TODO(burdon): !!!
          // ai: { client: AiService },
          // database: { db: space!.db },
        }),
      );
    }

    return { extractionFunction, executor, objects };
  }, [entityExtraction, space]);

  // Transcriber.
  const handleSegments = useCallback<TranscriberParams['onSegments']>(
    async (blocks) => {
      const message = Obj.make(DataType.Message, {
        sender: { name: 'You' },
        created: new Date().toISOString(),
        blocks,
      });
      if (!space) {
        void queue.append([message]);
        return;
      }

      if (entityExtraction !== 'none') {
        invariant(extractionFunction, 'extractionFunction is required');
        invariant(executor, 'executor is required');
        const result = await processTranscriptMessage({
          executor,
          function: extractionFunction,
          input: {
            message,
            objects: await objects,
          },
          options: {
            fallbackToRaw: true,
            timeout: 30_000,
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

const meta: Meta<typeof DefaultStory> = {
  title: 'plugins/plugin-transcription/MicrophoneTranscription',
  render: DefaultStory,
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
            // TODO(mykola): Make API easier to use.
            // TODO(mykola): Delete after enabling vector indexing by default.
            // Enable vector indexing.
            await client.services.services.QueryService!.setConfig({
              enabled: true,
              indexes: [
                //
                { kind: IndexKind.Kind.SCHEMA_MATCH },
                { kind: IndexKind.Kind.GRAPH },
                { kind: IndexKind.Kind.VECTOR },
              ],
            });
            await client.services.services.QueryService!.reindex();
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

type Story = StoryObj<typeof DefaultStory>;

export const Default: Story = {
  args: {
    detectSpeaking: false,
    entityExtraction: 'none',
    transcriberConfig: TRANSCRIBER_CONFIG,
    recorderConfig: RECORDER_CONFIG,
    audioConstraints: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    },
  },
};

export const EntityExtraction: Story = {
  args: {
    detectSpeaking: true,
    entityExtraction: 'ner',
    transcriberConfig: TRANSCRIBER_CONFIG,
    recorderConfig: RECORDER_CONFIG,
    audioConstraints: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  },
};

export const SpeechDetection: Story = {
  args: {
    detectSpeaking: true,
    entityExtraction: 'none',
    transcriberConfig: TRANSCRIBER_CONFIG,
    recorderConfig: RECORDER_CONFIG,
    audioConstraints: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  },
};
