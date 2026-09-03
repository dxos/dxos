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
import { corePlugins } from '@dxos/plugin-testing';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { random } from '@dxos/random';
import { useSpaces } from '@dxos/react-client/echo';
import { Button } from '@dxos/react-ui';
import { ChatThread, type ChatThreadEvent, type ChatView } from '@dxos/react-ui-assistant';
import {
  type MessageGenerator,
  createMessageGenerator,
  createSyntheticTurnGenerator,
} from '@dxos/react-ui-assistant/testing';
import { EditorPreviewProvider } from '@dxos/react-ui-editor';
import { useFeedModel } from '@dxos/react-ui-feed';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';
import { type Message as MessageType } from '@dxos/types';
import { Message, Organization, Person } from '@dxos/types';

import { translations } from '#translations';

random.seed(1);

/**
 * The plugin's own harness over the package thread: messages live on a real ECHO feed, are
 * generated (and streamed) through the Database/Feed services, and reach the thread through the
 * `useFeedModel` replace adapter — the exact path `Chat.Thread` ships.
 */
type StoryArgs = {
  generator?: MessageGenerator[];
  delay?: number;
  wait?: boolean;
  viewType?: ChatView;
  /** Render a toggle that unmounts and remounts the thread, reproducing navigating away and back. */
  remountable?: boolean;
};

/** Events the thread emitted, for the plays to assert against; reset per story mount. */
const recordedEvents: ChatThreadEvent[] = [];

const Thread = ({ messages, viewType }: { messages: MessageType.Message[]; viewType?: ChatView }) => {
  const model = useFeedModel(messages, { stops: 'prompt' });
  return (
    <ChatThread.Root model={model} viewType={viewType} onEvent={(event) => recordedEvents.push(event)}>
      <ChatThread.Viewport padding />
    </ChatThread.Root>
  );
};

const DefaultStory = ({ generator = [], delay = 0, wait, remountable, viewType }: StoryArgs) => {
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
      }).pipe(Effect.provide(Layer.mergeAll(Database.layer(space.db), Feed.layer(feed)))),
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
        <RemountableThread messages={messages} viewType={viewType} />
      ) : (
        <Thread messages={messages} viewType={viewType} />
      )}
    </EditorPreviewProvider>
  );
};

/**
 * Unmount/remount harness. Returning to a chat remounts the thread, and every item is rebuilt from
 * its message alone — tool rows included, which used to depend on a rehydration pass through
 * out-of-band widget state.
 */
const RemountableThread = (props: { messages: MessageType.Message[]; viewType?: ChatView }) => {
  const [mounted, setMounted] = useState(true);
  return (
    <div className='flex flex-col h-full'>
      <Button data-testid='story.toggleMount' onClick={() => setMounted((value) => !value)}>
        {mounted ? 'Unmount' : 'Mount'}
      </Button>
      {mounted && <Thread {...props} />}
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-assistant/components/Thread',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'column' }),
    withPluginManager({
      plugins: [
        ...corePlugins(),
        StorybookPlugin.make({}),
        PreviewPlugin.make(),
        ClientPlugin.make({
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

/**
 * Every user prompt carries its hover toolbar with the rewind control, and clicking it emits a
 * `rewind` event carrying that prompt's message id — the host (Chat.Root) owns what a rewind does.
 */
export const Rewind: Story = {
  args: {
    generator: createMessageGenerator(),
    wait: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    recordedEvents.length = 0;
    const buttons = await waitFor(
      async () => {
        const found = canvas.queryAllByTestId('chat.rewind');
        await expect(found.length).toBeGreaterThan(0);
        return found;
      },
      { timeout: 10_000 },
    );

    buttons[0].click();
    const rewinds = recordedEvents.filter((event) => event.type === 'rewind');
    await expect(rewinds).toHaveLength(1);
    // The id names the prompt the toolbar belongs to — its row carries the same object id.
    const row = buttons[0].closest<HTMLElement>('[data-object-id]');
    await expect(rewinds[0]).toEqual({ type: 'rewind', id: row?.dataset.objectId });
  },
};

/**
 * The view type is a projection the renderer applies per message: `thinking` shows the reasoning
 * widget, `normal` hides it — same model, different render.
 */
export const Thinking: Story = {
  args: {
    generator: createMessageGenerator(),
    wait: true,
    viewType: 'thinking',
  },
  play: async ({ canvasElement }) => {
    await waitFor(
      async () => {
        await expect(canvasElement.querySelectorAll('[data-reasoning-text]').length).toBeGreaterThan(0);
      },
      { timeout: 10_000 },
    );
  },
};

/** Synthetic context renders as its own panel above the bubble — never inside the reader's words. */
export const Context: Story = {
  args: {
    generator: createMessageGenerator(),
    wait: true,
  },
  play: async ({ canvasElement }) => {
    await waitFor(
      async () => {
        await expect(canvasElement.querySelectorAll('[data-testid="chat.context"]').length).toBeGreaterThan(0);
      },
      { timeout: 10_000 },
    );
    // The bubble itself carries none of the context markup.
    const bubbles = [...canvasElement.querySelectorAll('[data-testid="chat.context"]')];
    for (const panel of bubbles) {
      await expect(panel.parentElement?.textContent ?? '').not.toContain('<synthetic');
    }
  },
};

/**
 * A turn generated by the system rather than typed by the reader renders as its own panel. It has no
 * bubble — it is not the reader speaking — but it must be on screen, or the answer to it reads as
 * though the assistant spoke unprompted.
 */
export const SyntheticTurn: Story = {
  args: {
    generator: createSyntheticTurnGenerator(),
    wait: true,
  },
  play: async ({ canvasElement }) => {
    await waitFor(
      async () => {
        await expect(canvasElement.textContent ?? '').toContain('Picking up the next unchecked item.');
      },
      { timeout: 10_000 },
    );
    // The nudge itself is rendered, as the collapsed panel the registry maps `<synthetic>` to.
    await expect(canvasElement.querySelectorAll('[data-reasoning-text]').length).toBeGreaterThan(0);
    await expect(canvasElement.textContent ?? '').toContain('checklist still has unchecked items');
  },
};

export const Normal: Story = {
  args: {
    generator: createMessageGenerator(),
    wait: true,
    viewType: 'normal',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Rendered content is present (the thread mounted)…
    await waitFor(
      async () => {
        await expect(canvas.queryAllByTestId('chat.rewind').length).toBeGreaterThan(0);
      },
      { timeout: 10_000 },
    );
    // …and the reasoning is projected out, raw tags included.
    await expect(canvasElement.querySelectorAll('[data-reasoning-text]').length).toBe(0);
    await expect(canvasElement.textContent ?? '').not.toContain('<reasoning');
  },
};

/** The streaming path: messages land one by one, and the thread follows its tail. */
export const Delayed: Story = {
  args: {
    generator: createMessageGenerator(),
    delay: 500,
  },
};

/**
 * Tool rows must survive navigating away and back. Each item — tool panels included — is rebuilt
 * from its message, so the replay path and the streaming path must render the same rows.
 */
export const Remount: Story = {
  args: {
    generator: createMessageGenerator(),
    wait: true,
    remountable: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // The panel titles a call with the tool's own name; it used to prefix it with "Calling".
    // Streaming path: the tool rows render as the messages land.
    await expect(canvas.findByText(/^search$/, undefined, { timeout: 10_000 })).resolves.toBeTruthy();
    await expect(canvas.findByText(/^create$/, undefined, { timeout: 10_000 })).resolves.toBeTruthy();

    // Away and back.
    const toggle = await canvas.findByTestId('story.toggleMount');
    await userEvent.click(toggle);
    await waitFor(() => expect(canvas.queryByText(/^search$/)).toBeNull());
    await userEvent.click(toggle);

    // Replay path: same rows, rebuilt from the messages rather than from streaming updates.
    await expect(canvas.findByText(/^search$/, undefined, { timeout: 10_000 })).resolves.toBeTruthy();
    await expect(canvas.findByText(/^create$/, undefined, { timeout: 10_000 })).resolves.toBeTruthy();
  },
};
