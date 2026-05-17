//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useMemo, useState } from 'react';

import {
  type ExtractionFunction,
  extractionAnthropicFunction,
  extractionNerFunction,
  getNer,
  processTranscriptMessage,
} from '@dxos/assistant/extraction';
import { Filter, type Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { useSpaces } from '@dxos/react-client/echo';
import { Message, Organization, Person } from '@dxos/types';

import { useAudioTrack } from '#hooks';

import { type MediaStreamRecorderProps, type TranscriberProps } from '../transcriber';
import { useIsSpeaking, createStoryDecorators, useStoryMessageModel, useStoryTranscriber } from './common';
import { TranscriptionStory } from './TranscriptionStory';

const DEFAULT_TRANSCRIBER_CONFIG = {
  transcribeAfterChunksAmount: 50,
  prefixBufferChunksAmount: 10,
};

const DEFAULT_RECORDER_CONFIG = {
  interval: 200,
};

type DefaultStoryProps = {
  detectSpeaking?: boolean;
  transcriberConfig?: TranscriberProps['config'];
  recorderConfig?: MediaStreamRecorderProps['config'];
  audioConstraints?: MediaTrackConstraints;
  entityExtraction?: 'ner' | 'llm';
};

const DefaultStory = ({
  detectSpeaking,
  entityExtraction,
  transcriberConfig = DEFAULT_TRANSCRIBER_CONFIG,
  recorderConfig = DEFAULT_RECORDER_CONFIG,
  audioConstraints,
}: DefaultStoryProps) => {
  const [running, setRunning] = useState(false);
  const track = useAudioTrack(running, audioConstraints);
  const isSpeaking = detectSpeaking ? useIsSpeaking(track) : true;
  const { model, appendMessage } = useStoryMessageModel();
  const [space] = useSpaces();

  // Resolve the entity-extraction function + nearby objects once per `entityExtraction` toggle.
  const { extractionFunction, objects } = useMemo(() => {
    if (!space || !entityExtraction) {
      return {};
    }

    let extractionFunction: ExtractionFunction | undefined;
    let objects: Promise<Obj.Unknown[]> | undefined;
    if (entityExtraction === 'ner') {
      void getNer(); // Init model loading. Takes time.
      extractionFunction = extractionNerFunction;
    } else if (entityExtraction === 'llm') {
      extractionFunction = extractionAnthropicFunction;
      objects = space.db.query(Filter.or(Filter.type(Person.Person), Filter.type(Organization.Organization))).run();
    }
    return { extractionFunction, objects };
  }, [entityExtraction, space]);

  // Build a Message from each transcribed batch; optionally enrich via entity extraction.
  const handleSegments = useCallback<TranscriberProps['onSegments']>(
    async (blocks) => {
      const message = Message.make({
        sender: { name: 'You' },
        created: new Date().toISOString(),
        blocks,
      });

      if (entityExtraction && space) {
        invariant(extractionFunction, 'extractionFunction is required');
        const result = await processTranscriptMessage({
          function: extractionFunction,
          input: { message, objects: await objects },
          options: { fallbackToRaw: true, timeout: 30_000 },
        });
        appendMessage(result.message);
      } else {
        appendMessage(message);
      }
    },
    [appendMessage, space, entityExtraction, extractionFunction, objects],
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

// TODO(mykola): Fix hugging face quota issues.
// export const EntityExtraction: Story = {
//   args: {
//     detectSpeaking: true,
//     entityExtraction: 'ner',
//     audioConstraints: {
//       echoCancellation: true,
//       noiseSuppression: true,
//       autoGainControl: true,
//     },
//   },
// };
