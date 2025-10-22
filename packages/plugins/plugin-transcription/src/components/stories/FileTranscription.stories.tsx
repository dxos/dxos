//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Events, IntentPlugin, SettingsPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { scheduleTask } from '@dxos/async';
import { Context } from '@dxos/context';
import { Obj } from '@dxos/echo';
import { createQueueDXN } from '@dxos/echo/internal';
import { MemoryQueue } from '@dxos/echo-db';
import { FunctionExecutor, ServiceContainer } from '@dxos/functions';
import { log } from '@dxos/log';
import { ClientPlugin } from '@dxos/plugin-client';
import { PreviewPlugin } from '@dxos/plugin-preview';
import { SpacePlugin } from '@dxos/plugin-space';
import { StorybookLayoutPlugin } from '@dxos/plugin-storybook-layout';
import { ThemePlugin } from '@dxos/plugin-theme';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { defaultTx } from '@dxos/react-ui-theme';
import { DataType } from '@dxos/schema';
import { Testing, seedTestData } from '@dxos/schema/testing';

import { useAudioFile, useQueueModelAdapter, useTranscriber } from '../../hooks';
import { MessageNormalizer, getActorId } from '../../segments-normalization';
import { TestItem } from '../../testing';
import { type MediaStreamRecorderParams, type TranscriberParams } from '../../transcriber';
import { TranscriptionPlugin } from '../../TranscriptionPlugin';
import { renderByline } from '../Transcript';

import { TranscriptionStory } from './TranscriptionStory';
import { useIsSpeaking } from './useIsSpeaking';

const AudioFile = ({
  detectSpeaking,
  audioUrl,
  normalizeSentences,
  transcriberConfig,
  recorderConfig,
  audioConstraints,
}: {
  detectSpeaking?: boolean;
  normalizeSentences?: boolean;
  audioUrl: string;
  transcriberConfig?: TranscriberParams['config'];
  recorderConfig?: MediaStreamRecorderParams['config'];
  audioConstraints?: MediaTrackConstraints;
}) => {
  const [running, setRunning] = useState(false);
  const actor: DataType.Actor = useMemo(() => ({ name: 'You' }), []);

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
      return;
    }

    if (running) {
      void audio.play();
    } else {
      void audio.pause();
    }
  }, [audio, running]);

  // Transcriber.
  // TODO(dmaretskyi): Use space.queues.create() instead.
  const queueDxn = useMemo(() => createQueueDXN(), []);
  const queue = useMemo(() => new MemoryQueue<DataType.Message>(queueDxn), [queueDxn]);

  const model = useQueueModelAdapter(renderByline([]), queue);
  const handleSegments = useCallback<TranscriberParams['onSegments']>(
    async (blocks) => {
      void queue?.append([
        Obj.make(DataType.Message, {
          created: new Date().toISOString(),
          sender: actor,
          blocks,
        }),
      ]);
    },
    [queue],
  );

  const transcriber = useTranscriber({
    audioStreamTrack: track,
    onSegments: handleSegments,
    transcriberConfig,
    recorderConfig,
  });

  // Normalize sentences.
  const normalizer = useMemo(() => {
    if (!normalizeSentences) {
      return;
    }
    const executor = new FunctionExecutor(
      new ServiceContainer().setServices({
        // ai: {
        //   client: new Edge AiServiceClient({
        //     endpoint: AI_SERVICE_ENDPOINT.REMOTE,
        //     defaultGenerationOptions: {
        //       model: '@anthropic/claude-3-5-sonnet-20241022',
        //     },
        //   }),
        // },
      }),
    );

    return new MessageNormalizer({
      functionExecutor: executor,
      queue,
      startingCursor: { actorId: getActorId(actor), timestamp: new Date().toISOString() },
    });
  }, [normalizeSentences, queue, actor]);

  useEffect(() => {
    if (!normalizer) {
      return;
    }
    const ctx = new Context();
    scheduleTask(ctx, async () => {
      await normalizer.open();
      ctx.onDispose(async () => {
        await normalizer.close();
      });
    });
    return () => {
      void ctx.dispose();
    };
  }, [normalizer]);

  const manageChunkRecording = () => {
    if (running && isSpeaking && transcriber) {
      log.info('starting transcription');
      transcriber?.startChunksRecording();
    } else if ((!isSpeaking || !running) && transcriber) {
      log.info('stopping transcription');
      transcriber?.stopChunksRecording();
    }
  };

  useEffect(() => {
    const ctx = new Context();
    scheduleTask(ctx, async () => {
      if (transcriber && running) {
        await transcriber.open();
      } else if (!running) {
        await transcriber?.close();
      }
      manageChunkRecording();
    });

    return () => {
      void ctx.dispose();
    };
  }, [transcriber, running]);

  useEffect(() => {
    manageChunkRecording();
  }, [isSpeaking, stream]);

  return (
    <TranscriptionStory
      disabled={!stream}
      model={model}
      running={running}
      onRunningChange={setRunning}
      audioRef={ref}
    />
  );
};

const meta = {
  title: 'plugins/plugin-transcription/FileTranscription',
  decorators: [
    withTheme,
    withLayout({ container: 'column' }),
    withPluginManager({
      plugins: [
        ClientPlugin({
          types: [TestItem, DataType.Person, DataType.Organization, Testing.DocumentType],
          onClientInitialized: async ({ client }) => {
            await client.halo.createIdentity();
            await client.spaces.waitUntilReady();
            await client.spaces.default.waitUntilReady();
            await seedTestData(client.spaces.default);
          },
        }),
        SpacePlugin({}),
        IntentPlugin(),

        // UI
        ThemePlugin({ tx: defaultTx }),
        SettingsPlugin(),
        PreviewPlugin(),
        TranscriptionPlugin(),
        StorybookLayoutPlugin({}),
      ],
      fireEvents: [Events.SetupAppGraph],
    }),
  ],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const TRANSCRIBER_CONFIG = {
  transcribeAfterChunksAmount: 100,
  prefixBufferChunksAmount: 50,
  normalizeSentences: true,
};

const RECORDER_CONFIG = {
  interval: 200,
};

export const Default: StoryObj<typeof AudioFile> = {
  render: AudioFile,
  args: {
    detectSpeaking: true,
    // https://learnenglish.britishcouncil.org/general-english/audio-zone/living-london
    audioUrl: 'https://dxos.network/audio-london.m4a',
    // textUrl: 'https://dxos.network/audio-london.txt',
    transcriberConfig: TRANSCRIBER_CONFIG,
    recorderConfig: RECORDER_CONFIG,
  },
};

// TODO(mykola): Fix sentence normalization.
// export const WithSentenceNormalization: StoryObj<typeof AudioFile> = {
//   render: AudioFile,
//   args: {
//     detectSpeaking: true,
//     normalizeSentences: true,
//     // https://learnenglish.britishcouncil.org/general-english/audio-zone/living-london
//     audioUrl: 'https://dxos.network/audio-london.m4a',
//     // textUrl: 'https://dxos.network/audio-london.txt',
//     transcriberConfig: TRANSCRIBER_CONFIG,
//     recorderConfig: RECORDER_CONFIG,
//   },
// };
