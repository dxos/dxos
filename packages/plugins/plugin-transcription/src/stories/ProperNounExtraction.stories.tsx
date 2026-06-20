//
// Copyright 2026 DXOS.org
//

// Replays a seeded transcript and runs each message through the shared `enrichTranscriptMessage`
// core (Haiku proper-noun extraction → full-text search → reference links) — the same core the
// meeting integration invokes via the EnrichMessage Operation. Here it runs with a live edge Haiku
// preset; the `<Transcription>` editor's `preview()` extension renders the links as chips.

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useEffect, useRef, useState } from 'react';

import { AiServiceTestingPreset } from '@dxos/ai/testing';
import { enrichTranscriptMessage } from '@dxos/assistant/extraction';
import { EffectEx } from '@dxos/effect';
import { type Space, useSpaces } from '@dxos/react-client/echo';
import { IconButton, Panel, Toolbar } from '@dxos/react-ui';
import { type Message } from '@dxos/types';
import { seedTestData } from '@dxos/types/testing';

import { Transcription } from '../components/Transcription';
import { createStoryDecorators, useStoryMessageModel } from './common';

/** Enrich a message with a live edge Haiku; fall back to the raw message if the edge is unreachable. */
const enrich = (message: Message.Message, db: Space['db']): Promise<Message.Message> =>
  EffectEx.runPromise(
    enrichTranscriptMessage(message, { db }).pipe(Effect.provide(AiServiceTestingPreset('edge-remote'))),
  ).catch(() => message);

const DefaultStory = ({ interval = 4_000 }: { interval?: number }) => {
  const [space] = useSpaces();
  const { model, appendMessage } = useStoryMessageModel();
  const [running, setRunning] = useState(true);
  const indexRef = useRef(0);

  // The decorator seeds the objects; `seedTestData` also returns the transcript script we replay.
  const [messages, setMessages] = useState<Message.Message[]>([]);
  useEffect(() => {
    if (!space) {
      return;
    }
    void seedTestData(space).then(({ transcriptMessages }) => setMessages(transcriptMessages));
  }, [space]);

  // Replay the transcript one message at a time, enriching each before it is appended.
  useEffect(() => {
    if (!space || !running || messages.length === 0) {
      return;
    }

    let cancelled = false;
    const pump = async () => {
      while (!cancelled && indexRef.current < messages.length) {
        const enriched = await enrich(messages[indexRef.current], space.db);
        if (cancelled) {
          return;
        }
        indexRef.current += 1;
        appendMessage(enriched);
        await new Promise((resolve) => setTimeout(resolve, interval));
      }
    };

    void pump();
    return () => {
      cancelled = true;
    };
  }, [space, running, messages, interval, appendMessage]);

  return (
    <Panel.Root>
      <Panel.Toolbar asChild>
        <Toolbar.Root classNames='justify-end'>
          <IconButton
            icon={running ? 'ph--pause--regular' : 'ph--play--regular'}
            label={running ? 'Pause' : 'Resume'}
            onClick={() => setRunning((value) => !value)}
          />
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content className='dx-document'>
        <Transcription model={model} />
      </Panel.Content>
    </Panel.Root>
  );
};

const meta = {
  title: 'plugins/plugin-transcription/stories/ProperNounExtraction',
  render: DefaultStory,
  decorators: createStoryDecorators({ enableVectorIndex: true }),
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
