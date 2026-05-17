//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { scheduleTask } from '@dxos/async';
import { Context } from '@dxos/context';
import { Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { ClientPlugin } from '@dxos/plugin-client/testing';
import { initializeIdentity } from '@dxos/plugin-client/testing';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { withLayout } from '@dxos/react-ui/testing';
import { Message, Organization, Person } from '@dxos/types';
import { seedTestData } from '@dxos/types/testing';

import { useAudioFile, useFeedModelAdapter, useTranscriber } from '#hooks';
import { TestItem } from '#testing';

import { type MediaStreamRecorderProps, type TranscriberProps } from '../transcriber';
import { TranscriptionPlugin } from '../TranscriptionPlugin';
import { renderByline } from '../util';
import { TranscriptionStory } from './TranscriptionStory';
import { useIsSpeaking } from './useIsSpeaking';

const DEFAULT_TRANSCRIBER_CONFIG = {
  transcribeAfterChunksAmount: 100,
  prefixBufferChunksAmount: 50,
  normalizeSentences: true,
};

const DEFAULT_RECORDER_CONFIG = {
  interval: 200,
};

type DefaultStoryProps = {
  detectSpeaking?: boolean;
  normalizeSentences?: boolean;
  audioUrl: string;
  transcriberConfig?: TranscriberProps['config'];
  recorderConfig?: MediaStreamRecorderProps['config'];
  audioConstraints?: MediaTrackConstraints;
};

const DefaultStory = ({
  detectSpeaking,
  audioUrl,
  normalizeSentences,
  transcriberConfig = DEFAULT_TRANSCRIBER_CONFIG,
  recorderConfig = DEFAULT_RECORDER_CONFIG,
  audioConstraints,
}: DefaultStoryProps) => {
  const [running, setRunning] = useState(false);

  // Optional uploaded file overrides the default URL.
  // The useEffect below revokes the previous URL whenever it changes (and on unmount).
  const [uploadedUrl, setUploadedUrl] = useState<string>();
  useEffect(() => {
    return () => {
      if (uploadedUrl) {
        URL.revokeObjectURL(uploadedUrl);
      }
    };
  }, [uploadedUrl]);

  const handleUpload = useCallback((file: File) => {
    setRunning(false);
    setUploadedUrl(URL.createObjectURL(file));
  }, []);

  const sourceUrl = uploadedUrl ?? audioUrl;

  // Audio.
  const { audio, track, stream } = useAudioFile(sourceUrl, audioConstraints);

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

  // Local-only message buffer for the storybook; production uses a real space-backed Feed.
  const [messages, setMessages] = useState<Message.Message[]>([]);
  const model = useFeedModelAdapter(renderByline([]), messages);
  const handleSegments = useCallback<TranscriberProps['onSegments']>(async (blocks) => {
    setMessages((prev) => [
      ...prev,
      Obj.make(Message.Message, {
        created: new Date().toISOString(),
        sender: {},
        blocks,
      }),
    ]);
  }, []);

  const transcriber = useTranscriber({
    audioStreamTrack: track,
    onSegments: handleSegments,
    transcriberConfig,
    recorderConfig,
  });

  // TODO(burdon): Sentence normalization moved to require a real space-backed Feed + FeedService runtime.
  //  Re-enable here once the story has access to one.
  void normalizeSentences;

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
      audioRef={ref}
      disabled={!stream}
      model={model}
      running={running}
      onRunningChange={setRunning}
      onUpload={handleUpload}
    />
  );
};

const meta = {
  title: 'plugins/plugin-transcription/stories/FileTranscription',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'column' }),
    withPluginManager({
      plugins: [
        ...corePlugins(),
        StorybookPlugin({}),
        ClientPlugin({
          types: [TestItem, Person.Person, Organization.Organization],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { personalSpace } = yield* initializeIdentity(client);
              yield* Effect.promise(() => seedTestData(personalSpace));
            }),
        }),

        PreviewPlugin(),
        TranscriptionPlugin(),
      ],
      fireEvents: [AppActivationEvents.SetupAppGraph],
    }),
  ],
} satisfies Meta<DefaultStoryProps>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    detectSpeaking: true,
    // https://learnenglish.britishcouncil.org/general-english/audio-zone/living-london
    audioUrl: 'https://dxos.network/audio-london.m4a',
    // textUrl: 'https://dxos.network/audio-london.txt',
  },
};

// TODO(mykola): Fix sentence normalization.
// export const WithSentenceNormalization: StoryObj<typeof AudioFile> = {
//   args: {
//     detectSpeaking: true,
//     normalizeSentences: true,
//     // https://learnenglish.britishcouncil.org/general-english/audio-zone/living-london
//     audioUrl: 'https://dxos.network/audio-london.m4a',
//     // textUrl: 'https://dxos.network/audio-london.txt',
//   },
// };
