//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import type * as Types from 'effect/Types';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Feed, Filter, Obj, Query } from '@dxos/echo';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { random } from '@dxos/random';
import { useMembers, useQuery, useSpaces } from '@dxos/react-client/echo';
import { IconButton, Panel, Toolbar } from '@dxos/react-ui';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { withLayout } from '@dxos/react-ui/testing';
import { type ContentBlock, Message, Organization, Person } from '@dxos/types';

import { useFeedModelAdapter } from '#hooks';
import { MessageBuilder, TestItem, useTestTranscriptionQueue } from '#testing';
import { translations } from '#translations';

import { SerializationModel } from '../../model';
import { renderByline } from '../../util';
import { type TranscriptionProps, Transcription } from './Transcription';

random.seed(1);

type Source = 'local' | 'feed';

type StoryArgs = {
  /** Where transcript messages come from. */
  source?: Source;
  /** Number of synthetic messages to pre-populate (local source only). */
  seed?: number;
};

const DefaultStory = ({ source = 'local', seed = 0, ...props }: StoryArgs) => {
  const [resetKey, setResetKey] = useState(0);
  const handleReset = useCallback(() => setResetKey((value) => value + 1), []);
  return source === 'feed' ? (
    <FeedStory key={resetKey} onReset={handleReset} {...props} />
  ) : (
    <LocalStory key={resetKey} seed={seed} onReset={handleReset} {...props} />
  );
};

type InnerProps = {
  onReset: () => void;
};

const LocalStory = ({ seed = 0, onReset, ...props }: InnerProps & { seed?: number }) => {
  const builder = useMemo(() => new MessageBuilder(), []);
  const [initialMessages, setInitialMessages] = useState<Message.Message[]>([]);
  const [ready, setReady] = useState(seed === 0);

  useEffect(() => {
    // Reset on every seed change so Storybook controls don't leave stale messages from a prior run.
    let cancelled = false;
    setInitialMessages([]);
    setReady(seed === 0);

    if (seed === 0) {
      return () => {
        cancelled = true;
      };
    }

    void Promise.all(Array.from({ length: seed }, () => builder.createMessage())).then((messages) => {
      if (cancelled) {
        return;
      }
      setInitialMessages(messages);
      setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [seed, builder]);

  const model = useMemo(
    () => new SerializationModel<Message.Message>(renderByline([]), initialMessages),
    [initialMessages],
  );

  const [running, setRunning] = useState(true);
  const [currentMessage, setCurrentMessage] = useState<Types.Mutable<Message.Message> | null>(null);

  useEffect(() => {
    if (!ready || !running) {
      return;
    }

    if (!currentMessage) {
      void builder.createMessage().then((message) => {
        model.appendChunk(message);
        setCurrentMessage(message);
      });
      return;
    }

    const id = setInterval(() => {
      if (currentMessage.blocks.length >= 3) {
        setCurrentMessage(null);
        clearInterval(id);
        return;
      }
      Obj.update(currentMessage, (currentMessage) => {
        (currentMessage.blocks as ContentBlock.Any[]).push(builder.createBlock());
      });
      model.updateChunk(currentMessage);
    }, 3_000);

    return () => clearInterval(id);
  }, [ready, running, currentMessage, model, builder]);

  return <Shell model={model} running={running} onRunningChange={setRunning} onReset={onReset} {...props} />;
};

const FeedStory = ({ onReset, ...props }: InnerProps) => {
  const [running, setRunning] = useState(true);
  const [space] = useSpaces();
  const members = useMembers(space?.id).map((member) => member.identity);
  const feed = useTestTranscriptionQueue(space, running, 2_000);
  const messages = useQuery(
    space?.db,
    feed ? Query.select(Filter.type(Message.Message)).from(feed) : Query.select(Filter.nothing()),
  );
  const model = useFeedModelAdapter(renderByline(members), messages, []);

  return <Shell model={model} running={running} onRunningChange={setRunning} onReset={onReset} {...props} />;
};

type ShellProps = TranscriptionProps & {
  running: boolean;
  onRunningChange: (running: boolean) => void;
  onReset: () => void;
};

const Shell = ({ model, running, onRunningChange, onReset, ...props }: ShellProps) => (
  <Panel.Root>
    <Panel.Toolbar asChild>
      <Toolbar.Root classNames='justify-end'>
        <IconButton
          icon={running ? 'ph--pause--regular' : 'ph--play--regular'}
          label={running ? 'Pause' : 'Start'}
          onClick={() => onRunningChange(!running)}
        />
        <IconButton icon='ph--x--regular' label='Reset' onClick={onReset} />
      </Toolbar.Root>
    </Panel.Toolbar>
    <Panel.Content className='dx-document'>
      <Transcription model={model} {...props} />
    </Panel.Content>
    <Panel.Statusbar className='flex items-center justify-center'>
      <JsonHighlighter data={model.toJSON()} indent={0} classNames='text-sm' />
    </Panel.Statusbar>
  </Panel.Root>
);

const meta = {
  title: 'plugins/plugin-transcription/components/Transcription',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      plugins: [
        ...corePlugins(),
        StorybookPlugin({}),
        ClientPlugin({
          types: [TestItem, Person.Person, Organization.Organization, Feed.Feed, Message.Message],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* initializeIdentity(client);
            }),
        }),
        PreviewPlugin(),
      ],
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
    source: 'local',
    seed: 10,
  },
};

export const Empty: Story = {
  args: {
    source: 'local',
    seed: 0,
  },
};

export const WithQueue: Story = {
  args: {
    source: 'feed',
  },
};
