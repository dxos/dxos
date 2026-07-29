//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Layer from 'effect/Layer';
import React, { useEffect, useMemo, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Database, Feed, Filter, Query } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { EffectEx } from '@dxos/effect';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { StorybookPlugin, corePlugins } from '@dxos/plugin-testing';
import { random } from '@dxos/random';
import { useSpaces } from '@dxos/react-client/echo';
import { Button } from '@dxos/react-ui';
import { EditorPreviewProvider } from '@dxos/react-ui-editor';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { Message, Organization, Person } from '@dxos/types';

import { createMessageGenerator } from '#testing';
import { translations } from '#translations';

import { ChatThread, type ChatThreadProps } from './ChatThread';

random.seed(1);

type MessageGenerator = Effect.Effect<void, never, Database.Service | Feed.ContextFeedService>;

type StoryArgs = {
  generator?: MessageGenerator[];
  delay?: number;
  wait?: boolean;
  /** Render a toggle that unmounts and remounts the thread, reproducing navigating away and back. */
  remountable?: boolean;
} & ChatThreadProps;

const DefaultStory = ({ generator = [], delay = 0, wait, remountable, ...props }: StoryArgs) => {
  const [space] = useSpaces();
  const feed = useMemo<Feed.Feed | undefined>(
    () => (space ? space.db.add(Feed.make({ name: 'chat' })) : undefined),
    [space],
  );
  const messages = useQuery(
    space?.db,
    feed ? Query.select(Filter.type(Message.Message)).from(feed) : Query.select(Filter.nothing()),
  );
  const [done, setDone] = useState(false);

  // Generate messages.
  useEffect(() => {
    if (!space || !feed) {
      return;
    }

    const fiber = Effect.runFork(
      Effect.gen(function* () {
        for (const step of generator) {
          yield* step;
          if (delay) {
            yield* Effect.sleep(delay);
          }
        }

        setDone(true);
      }).pipe(Effect.provide(Layer.mergeAll(Database.layer(space.db), Feed.ContextFeedService.layer(feed)))),
    );

    return () => {
      void EffectEx.runAndForwardErrors(Fiber.interrupt(fiber));
    };
  }, [space, feed, generator, delay]);

  if (wait && !done) {
    return <Loading data={{ wait, done }} />;
  }

  return (
    <EditorPreviewProvider onLookup={async ({ dxn, label }) => ({ label, text: dxn })}>
      {remountable ? (
        <RemountableThread {...props} messages={messages} />
      ) : (
        <ChatThread {...props} messages={messages} />
      )}
    </EditorPreviewProvider>
  );
};

/**
 * Unmount/remount harness. Returning to a chat remounts the thread, which re-walks the messages and
 * replaces the document — and a full replace clears accumulated widget props, so tool rows depend on
 * the rehydration that follows it. Mounting fresh never exercises that path.
 */
const RemountableThread = (props: ChatThreadProps) => {
  const [mounted, setMounted] = useState(true);
  return (
    <div className='flex flex-col h-full'>
      <Button data-testid='story.toggleMount' onClick={() => setMounted((value) => !value)}>
        {mounted ? 'Unmount' : 'Mount'}
      </Button>
      {mounted && <ChatThread {...props} />}
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-assistant/components/ChatThread',
  component: ChatThread,
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'column' }),
    withPluginManager({
      plugins: [
        ...corePlugins(),
        StorybookPlugin({}),
        PreviewPlugin(),
        ClientPlugin({
          types: [Feed.Feed, Message.Message, Organization.Organization, Person.Person],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* initializeIdentity(client);
            }),
        }),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<StoryArgs>;

export const Default: Story = {
  args: {
    generator: createMessageGenerator(),
    wait: true,
  },
};

export const Delayed: Story = {
  args: {
    generator: createMessageGenerator(),
    delay: 500,
    options: {
      autoScroll: true,
      typewriter: true,
      cursor: true,
    },
  },
};

/**
 * Tool rows must survive navigating away and back — they do not today, which this reproduces.
 *
 * Tool rows render from out-of-band widget state, not from the document: `blockToMarkdown` emits a
 * `<toolCall id/>` placeholder and pushes the blocks via `updateWidget`. On remount `MessageSyncer.reset`
 * replaces the document, which fires `xmlTagResetEffect` and clears that state, then rehydrates it in a
 * `.then()`. Both halves are dropped when the syncer runs before CodeMirror's view exists
 * (`MarkdownStream.onReset` returns early without dispatching but still resolves; `updateWidget` is
 * `viewRef.current?.dispatch`, a no-op when null). The text survives — it is replayed from `contentRef`
 * once the view initializes — but the widget state is never re-applied, so the rows come back empty.
 *
 * TODO(burdon): Un-skip once the widget state is re-applied after view initialization.
 */
export const Remount: Story = {
  args: {
    generator: createMessageGenerator(),
    wait: true,
    remountable: true,
  },
  tags: ['!test'],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Streaming path: the tool rows render as the messages land.
    await expect(canvas.findByText(/Calling search/, undefined, { timeout: 10_000 })).resolves.toBeTruthy();
    await expect(canvas.findByText(/Calling create/, undefined, { timeout: 10_000 })).resolves.toBeTruthy();

    // Away and back.
    const toggle = await canvas.findByTestId('story.toggleMount');
    await userEvent.click(toggle);
    await waitFor(() => expect(canvas.queryByText(/Calling search/)).toBeNull());
    await userEvent.click(toggle);

    // Replay path: same rows, rebuilt from the messages rather than from streaming updates.
    await expect(canvas.findByText(/Calling search/, undefined, { timeout: 10_000 })).resolves.toBeTruthy();
    await expect(canvas.findByText(/Calling create/, undefined, { timeout: 10_000 })).resolves.toBeTruthy();
  },
};
