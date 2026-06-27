//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { useAudioFile } from '#hooks';

import { type MediaStreamRecorderProps, type TranscriberProps } from '../transcriber';
import {
  useIsSpeaking,
  createStoryDecorators,
  useStoryAppendSegments,
  useStoryMessageModel,
  useStoryTranscriber,
} from './common';
import { TranscriptionStory } from './TranscriptionStory';

const DEFAULT_TRANSCRIBER_CONFIG = {
  transcribeAfterChunksAmount: 100,
  prefixBufferChunksAmount: 50,
  normalizeSentences: true,
};

const DEFAULT_RECORDER_CONFIG = {
  interval: 200,
};

type StoryArgs = {
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
}: StoryArgs) => {
  const [running, setRunning] = useState(false);

  // Optional uploaded file overrides the default URL; revoke the previous URL on change/unmount.
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
  const { audio, track, stream } = useAudioFile(sourceUrl, audioConstraints);
  const isSpeaking = detectSpeaking ? useIsSpeaking(track) : true;

  // Pipe the decoded stream into the <audio> element so the user hears playback.
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    if (ref.current && stream) {
      ref.current.srcObject = stream;
    }
  }, [stream]);

  // Mirror the toolbar's running flag to the underlying HTMLAudioElement.
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

  const { model, appendMessage } = useStoryMessageModel();
  const handleSegments = useStoryAppendSegments(appendMessage);

  useStoryTranscriber({
    audioStreamTrack: track,
    running,
    isSpeaking,
    transcriberConfig,
    recorderConfig,
    onSegments: handleSegments,
  });

  // TODO(burdon): Sentence normalization moved to require a real space-backed Feed + FeedService runtime.
  //  Re-enable here once the story has access to one.
  void normalizeSentences;

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
  decorators: createStoryDecorators(),
} satisfies Meta<StoryArgs>;

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
//     audioUrl: 'https://dxos.network/audio-london.m4a',
//   },
// };
