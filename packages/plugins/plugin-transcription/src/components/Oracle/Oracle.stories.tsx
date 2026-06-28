//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useCallback, useEffect, useState } from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { corePlugins } from '@dxos/plugin-testing';
import { IconButton, Panel, Toolbar } from '@dxos/react-ui';
import { withLayout } from '@dxos/react-ui/testing';
import { type ContentBlock, type Message } from '@dxos/types';

import { useAudioTrack, useTranscriber } from '#hooks';
import { translations } from '#translations';

import { TranscriptionPlugin } from '../../TranscriptionPlugin';
import { Oracle } from './Oracle';

type StoryArgs = {
  delay?: number;
};

const DefaultStory = ({ delay }: StoryArgs) => {
  const [recording, setRecording] = useState(false);
  const [text, setText] = useState('');
  const elapsed = useStopwatch(recording);
  const track = useAudioTrack(recording);

  // Build the latest transcribed text from incoming blocks.
  const handleSegments = useCallback(async (blocks: Message.Message['blocks']) => {
    const phrase = blocks
      .filter((block): block is ContentBlock.Transcript => block._tag === 'transcript')
      .map((block) => block.text.trim())
      .filter(Boolean)
      .join(' ');

    setText((prev) => (prev ? `${prev} ${phrase}` : phrase));
  }, []);

  // Drive the transcriber off the recording flag.
  // Default `transcribeAfterChunksAmount` is 50 × 200ms = 10s, so the first phrase only
  // surfaces after ~10s. Drop it to 15 chunks (~3s) so the TextBlock starts updating fast.
  const transcriber = useTranscriber({
    audioStreamTrack: track,
    onSegments: handleSegments,
    transcriberConfig: { transcribeAfterChunksAmount: 15, prefixBufferChunksAmount: 5 },
  });
  useEffect(() => {
    if (!transcriber) {
      return;
    }

    let cancelled = false;
    void transcriber.open().then(() => {
      if (!cancelled && recording) {
        transcriber.startChunksRecording();
      }
    });

    return () => {
      cancelled = true;
      transcriber.stopChunksRecording();
    };
  }, [transcriber, recording]);

  return (
    <Panel.Root>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <IconButton
            icon={recording ? 'ph--stop-circle--regular' : 'ph--microphone--regular'}
            label={recording ? 'Stop' : 'Record'}
            onClick={() => setRecording((value) => !value)}
          />
          <IconButton disabled={recording} icon='ph--x--regular' label='Clear' onClick={() => setText('')} />
          <Toolbar.Separator />
          <Toolbar.Text classNames='text-right tabular-nums text-subdued'>{elapsed}s</Toolbar.Text>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Oracle.Root text={text} delay={delay}>
        <Panel.Content asChild>
          <Oracle.Content>
            <Oracle.Canvas />
            <Oracle.Text />
          </Oracle.Content>
        </Panel.Content>
      </Oracle.Root>
    </Panel.Root>
  );
};

const meta = {
  title: 'plugins/plugin-transcription/components/Oracle',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* initializeIdentity(client);
            }),
        }),
        TranscriptionPlugin(),
      ],
      setupEvents: [AppActivationEvents.SetupSettings],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    delay: 12,
  },
};

export const Instant: Story = {
  args: {
    delay: 0,
  },
};

/** Seconds elapsed while `running`; resets to 0 each time `running` toggles back to true. */
const useStopwatch = (running: boolean): number => {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!running) {
      return;
    }
    setSeconds(0);
    const id = setInterval(() => setSeconds((value) => value + 1), 1_000);
    return () => clearInterval(id);
  }, [running]);
  return seconds;
};
