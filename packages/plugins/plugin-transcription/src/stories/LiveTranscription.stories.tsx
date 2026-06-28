//
// Copyright 2025 DXOS.org
//

/**
 * Live microphone transcription into a message list, the mic-source counterpart to FileTranscription.
 *
 * - `Default` captures the mic with raw audio constraints (no echo/noise/gain processing), speaking detection off.
 * - `SpeechDetection` enables `detectSpeaking` (voice-activity gating) with processed audio constraints on.
 * - `useAudioTrack` supplies the live track; `useStoryTranscriber` drives the transcriber lifecycle.
 * - Each transcribed batch becomes a `Message` ("You") appended to an in-memory model (`useStoryMessageModel`).
 * - Uses `createStoryDecorators({ enableVectorIndex: true })` and the shared `TranscriptionStory` wrapper.
 */

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useState } from 'react';

import { Message } from '@dxos/types';

import { useAudioTrack } from '#hooks';

import { type MediaStreamRecorderProps, type TranscriberProps } from '../transcriber';
import { useIsSpeaking, createStoryDecorators, useStoryMessageModel, useStoryTranscriber } from './testing';
import { TranscriptionStory } from './TranscriptionStory';

const DEFAULT_TRANSCRIBER_CONFIG = {
  transcribeAfterChunksAmount: 50,
  prefixBufferChunksAmount: 10,
};

const DEFAULT_RECORDER_CONFIG = {
  interval: 200,
};

type StoryArgs = {
  detectSpeaking?: boolean;
  transcriberConfig?: TranscriberProps['config'];
  recorderConfig?: MediaStreamRecorderProps['config'];
  audioConstraints?: MediaTrackConstraints;
};

const DefaultStory = ({
  detectSpeaking,
  transcriberConfig = DEFAULT_TRANSCRIBER_CONFIG,
  recorderConfig = DEFAULT_RECORDER_CONFIG,
  audioConstraints,
}: StoryArgs) => {
  const [running, setRunning] = useState(false);
  const track = useAudioTrack(running, audioConstraints);
  const isSpeaking = detectSpeaking ? useIsSpeaking(track) : true;
  const { model, appendMessage } = useStoryMessageModel();

  // Build a Message from each transcribed batch and append it to the local buffer.
  const handleSegments = useCallback<TranscriberProps['onSegments']>(
    async (blocks) => {
      appendMessage(
        Message.make({
          sender: { name: 'You' },
          created: new Date().toISOString(),
          blocks,
        }),
      );
    },
    [appendMessage],
  );

  useStoryTranscriber({
    audioStreamTrack: track,
    running,
    isSpeaking,
    transcriberConfig,
    recorderConfig,
    onSegments: handleSegments,
  });

  return <TranscriptionStory model={model} running={running} onRunningChange={setRunning} />;
};

const meta = {
  title: 'plugins/plugin-transcription/stories/LiveTranscription',
  render: DefaultStory,
  decorators: createStoryDecorators({ enableVectorIndex: true }),
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    detectSpeaking: false,
    audioConstraints: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    },
  },
};

export const SpeechDetection: Story = {
  args: {
    detectSpeaking: true,
    audioConstraints: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  },
};
