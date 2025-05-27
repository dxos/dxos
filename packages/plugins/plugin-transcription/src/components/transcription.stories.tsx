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
import { IconButton, Toolbar } from '@dxos/react-ui';
import { ScrollContainer } from '@dxos/react-ui-components';
import { defaultTx, mx } from '@dxos/react-ui-theme';
import { DataType } from '@dxos/schema';
import { seedTestData, Testing } from '@dxos/schema/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { renderMarkdown, Transcript } from './Transcript';
import { TranscriptionPlugin } from '../TranscriptionPlugin';
import { processTranscriptMessage } from '../entity-extraction';
import { useAudioFile, useAudioTrack, useQueueModelAdapter, useTranscriber } from '../hooks';
import { type SerializationModel } from '../model';
import { TestItem } from '../testing';
import { type TranscriberParams } from '../transcriber';

const TranscriptionStory: FC<{
  model: SerializationModel<DataType.Message>;
  running: boolean;
  onRunningChange: Dispatch<SetStateAction<boolean>>;
}> = ({ model, running, onRunningChange }) => {
  const space = useSpace();

  return (
    <div className='flex flex-col w-[30rem]'>
      <Toolbar.Root>
        <IconButton
          iconOnly
          icon={running ? 'ph--pause--regular' : 'ph--play--regular'}
          label={running ? 'Pause' : 'Play'}
          onClick={() => onRunningChange((running) => !running)}
        />
      </Toolbar.Root>
      <ScrollContainer>
        <Transcript space={space} model={model} attendableId='story' />
      </ScrollContainer>
    </div>
  );
};

const aiService = new AIServiceEdgeClient({
  endpoint: AI_SERVICE_ENDPOINT.REMOTE,
});

const Microphone = ({ entityExtraction }: { entityExtraction?: boolean }) => {
  const [running, setRunning] = useState(false);

  // Audio.
  const track = useAudioTrack(running);

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

  const config = useRef<TranscriberParams['config']>({
    transcribeAfterChunksAmount: 10,
    prefixBufferChunksAmount: 5,
  });

  const transcriber = useTranscriber({
    audioStreamTrack: track,
    onSegments: handleSegments,
    config: config.current,
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
    if (running && transcriber?.isOpen) {
      transcriber?.startChunksRecording();
    } else if (!running) {
      transcriber?.stopChunksRecording();
    }
  }, [transcriber, running, isOpen]);

  return <TranscriptionStory model={model} running={running} onRunningChange={setRunning} />;
};

const AudioFile = ({ audioUrl }: { audioUrl: string; transcriptUrl: string }) => {
  const [running, setRunning] = useState(false);

  // Audio.
  const { audio, track } = useAudioFile(audioUrl);

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
  });

  useEffect(() => {
    if (transcriber && running) {
      void transcriber.open().then(manageChunkRecording);
    } else if (!running) {
      transcriber?.stopChunksRecording();
      void transcriber?.close();
    }
  }, [transcriber, running]);

  const manageChunkRecording = () => {
    if (track?.readyState === 'live' && transcriber?.isOpen) {
      log.info('starting transcription');
      transcriber.startChunksRecording();
    } else if (track?.readyState !== 'live' && transcriber) {
      log.info('stopping transcription');
      transcriber.stopChunksRecording();
    }
  };
  useEffect(() => {
    manageChunkRecording();
  }, [transcriber, track?.readyState, transcriber?.isOpen]);

  return <TranscriptionStory model={model} running={running} onRunningChange={setRunning} />;
};

const meta: Meta<typeof AudioFile> = {
  title: 'plugins/plugin-transcription/transcription',
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
      // capabilities: [
      //   contributes(
      //     Capabilities.ReactSurface,
      //     createSurface({
      //       id: 'preview-test',
      //       role: 'preview',
      //       component: ({ data }) => {
      //         const schema = getSchema(data);
      //         if (!schema) {
      //           return null;
      //         }

      //         return <Form schema={schema} values={data} />;
      //       },
      //     }),
      //   ),
      // ],
    }),
    withTheme,
    withLayout({ fullscreen: true, classNames: 'justify-center' }),
  ],
};

const DetectKeyWord = ({ keyword }: { keyword: string }) => {
  const [running, setRunning] = useState(false);
  const queueDxn = useMemo(() => createQueueDxn(), []);
  const queue = useMemo(() => new MemoryQueue<DataType.Message>(queueDxn), [queueDxn]);
  const model = useQueueModelAdapter(renderMarkdown([]), queue);
  const [found, setFound] = useState(false);

  const recognition = useMemo(() => {
    // TODO(mykola): Fix types
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const SpeechGrammarList = (window as any).SpeechGrammarList || (window as any).webkitSpeechGrammarList;
    if (!SpeechRecognition || !SpeechGrammarList) {
      console.error('Speech recognition not supported in this browser');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;
    // Add this line to enable punctuation
    recognition.grammars = new SpeechGrammarList();

    // TODO(mykola): Fix types
    recognition.onresult = (event: any) => {
      log.info('recognition result', { event });
      const current = event.resultIndex;
      const transcript = event.results[current][0].transcript;
      // Remove punctuation and normalize whitespace for comparison
      const normalizeText = (text: string) =>
        text
          .toLowerCase()
          .replace(/[.,!?]/g, '')
          .replace(/\s+/g, ' ')
          .trim();
      const normalizedTranscript = normalizeText(transcript);
      const normalizedKeyword = normalizeText(keyword);
      const found = normalizedTranscript.includes(normalizedKeyword);
      setFound(found);
      setTimeout(() => {
        setFound(false);
      }, 1000);

      const message = create(DataType.Message, {
        sender: { name: 'You' },
        created: new Date().toISOString(),
        blocks: [
          {
            type: 'transcription',
            started: new Date().toISOString(),
            text: transcript, // Keep original transcript with punctuation
          },
        ],
      });
      log.info('found', { found, transcript, normalizedTranscript, normalizedKeyword });
      void queue.append([message]);
    };

    // TODO(mykola): Fix types
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setRunning(false);
    };

    return recognition;
  }, []);

  useEffect(() => {
    if (running) {
      recognition?.start();
    } else {
      recognition?.stop();
    }
  }, [running, recognition]);

  return (
    <div className={mx('flex', found && 'bg-green-500')}>
      <TranscriptionStory model={model} running={running} onRunningChange={setRunning} />
    </div>
  );
};

export default meta;

export const Default: StoryObj<typeof Microphone> = {
  render: Microphone,
  args: {
    entityExtraction: false,
  },
};

export const EntityExtraction: StoryObj<typeof Microphone> = {
  render: Microphone,
  args: {
    entityExtraction: true,
  },
};

export const File: StoryObj<typeof AudioFile> = {
  render: AudioFile,
  args: {
    // https://learnenglish.britishcouncil.org/general-english/audio-zone/living-london
    transcriptUrl: 'https://dxos.network/audio-london.txt',
    audioUrl: 'https://dxos.network/audio-london.m4a',
  },
};

export const WordDetection: StoryObj<typeof DetectKeyWord> = {
  render: DetectKeyWord,
  args: {
    keyword: 'hey, rich',
  },
};
