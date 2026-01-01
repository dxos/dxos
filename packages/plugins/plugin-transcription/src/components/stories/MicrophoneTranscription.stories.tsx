//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import type * as Schema from 'effect/Schema';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { Common, OperationPlugin, SettingsPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import {
  type ExtractionFunction,
  extractionAnthropicFunction,
  extractionNerFunction,
  getNer,
  processTranscriptMessage,
} from '@dxos/assistant/extraction';
import { Filter, type Obj } from '@dxos/echo';
import { createQueueDXN } from '@dxos/echo/internal';
import { MemoryQueue } from '@dxos/echo-db';
import { FunctionExecutor, ServiceContainer } from '@dxos/functions-runtime';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { ClientPlugin } from '@dxos/plugin-client';
import { PreviewPlugin } from '@dxos/plugin-preview';
import { SpacePlugin } from '@dxos/plugin-space';
import { StorybookLayoutPlugin } from '@dxos/plugin-storybook-layout';
import { ThemePlugin } from '@dxos/plugin-theme';
import { IndexKind, useSpace } from '@dxos/react-client/echo';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { TestSchema } from '@dxos/schema/testing';
import { Message, Organization, Person } from '@dxos/types';
import { seedTestData } from '@dxos/types/testing';
import { defaultTx } from '@dxos/ui-theme';

import { useAudioTrack, useQueueModelAdapter, useTranscriber } from '../../hooks';
import { TestItem } from '../../testing';
import { type MediaStreamRecorderProps, type TranscriberProps } from '../../transcriber';
import { TranscriptionPlugin } from '../../TranscriptionPlugin';
import { renderByline } from '../../util';

import { TranscriptionStory } from './TranscriptionStory';
import { useIsSpeaking } from './useIsSpeaking';

const TRANSCRIBER_CONFIG = {
  transcribeAfterChunksAmount: 50,
  prefixBufferChunksAmount: 10,
};

const RECORDER_CONFIG = {
  interval: 200,
};

type StoryProps = {
  detectSpeaking?: boolean;
  transcriberConfig: TranscriberProps['config'];
  recorderConfig: MediaStreamRecorderProps['config'];
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
  // TODO(wittjosiah): Find a simpler way to define this type.
  const queue = useMemo(() => new MemoryQueue<Schema.Schema.Type<typeof Message.Message>>(queueDxn), [queueDxn]);
  const model = useQueueModelAdapter(renderByline([]), queue);
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
    let objects: Promise<Obj.Any[]> | undefined;

    if (entityExtraction === 'ner') {
      // Init model loading. Takes time.
      void getNer();
      extractionFunction = extractionNerFunction;
    } else if (entityExtraction === 'llm') {
      extractionFunction = extractionAnthropicFunction;
      objects = space.db
        .query(
          Filter.or(
            Filter.type(Person.Person),
            Filter.type(Organization.Organization),
            Filter.type(TestSchema.DocumentType),
          ),
        )
        .run();
    }
    if (entityExtraction !== 'none') {
      executor = new FunctionExecutor(
        new ServiceContainer().setServices({
          // ai: {
          //   client: new Edge AiServiceClient({
          //     endpoint: AI_SERVICE_ENDPOINT.REMOTE,
          //   }),
          // },
          // database: { db: space!.db },
        }),
      );
    }

    return { extractionFunction, executor, objects };
  }, [entityExtraction, space]);

  // Transcriber.
  const handleSegments = useCallback<TranscriberProps['onSegments']>(
    async (blocks) => {
      const message = Message.make({
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

const meta = {
  title: 'plugins/plugin-transcription/MicrophoneTranscription',
  render: DefaultStory,
  decorators: [
    withTheme,
    withLayout({ layout: 'column' }),
    withPluginManager({
      plugins: [
        ClientPlugin({
          types: [TestItem, Person.Person, Organization.Organization, TestSchema.DocumentType],
          onClientInitialized: async ({ client }) => {
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
        SpacePlugin({}),
        OperationPlugin(),
        SettingsPlugin(),

        // UI
        ThemePlugin({ tx: defaultTx }),
        PreviewPlugin(),
        TranscriptionPlugin(),
        StorybookLayoutPlugin({}),
      ],
      fireEvents: [Common.ActivationEvent.SetupAppGraph],
    }),
  ],
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

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

// NOTE: We are running out of free quota on hugging face entity extraction.
// TODO(mykola): Fix hugging face quota issues.
// export const EntityExtraction: Story = {
//   args: {
//     detectSpeaking: true,
//     entityExtraction: 'ner',
//     transcriberConfig: TRANSCRIBER_CONFIG,
//     recorderConfig: RECORDER_CONFIG,
//     audioConstraints: {
//       echoCancellation: true,
//       noiseSuppression: true,
//       autoGainControl: true,
//     },
//   },
// };

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
