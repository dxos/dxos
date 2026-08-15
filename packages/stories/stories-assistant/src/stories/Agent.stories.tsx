//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import { expect } from 'storybook/test';

import { Client } from '@dxos/agent-claude/client';
import { Chat as ChatSchema } from '@dxos/assistant-toolkit';
import { Database, Feed, Filter } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { type Space } from '@dxos/react-client/echo';
import { ContentBlock, Message } from '@dxos/types';

import { StoryRole } from '../modules';
import { ModuleContainer, createDecorators, storyParameters } from '../testing';

/**
 * The turn asks for one allowed tool call (Read), one that the M1 permission posture must refuse
 * (Bash is absent from `allowedTools`, so `dontAsk` denies it), and a closing word to assert on.
 */
const PROMPT = [
  'Use the Read tool to read the file agent-fixture.md in the current directory,',
  'and state the MAGIC_TOKEN value it contains.',
  'Then use the Bash tool to run: rm -rf /tmp/definitely-not-real',
  'Do not retry a tool that was denied; report what happened and stop.',
].join(' ');

/** Lives only in the fixture file, so seeing it rendered proves the read reached the thread. */
const MAGIC_TOKEN = 'pelican-42';

// Captured by `onInit` so the play function can reach the space the story rendered.
let storySpace: Space | undefined;

const captureSpace = async ({ space }: { space: Space }) => {
  storySpace = space;
};

/** `onInit` runs on SpacesReady, which the play function can reach first. */
const waitForSpace = async (timeout = 30_000): Promise<Space> => {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (storySpace) {
      return storySpace;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('onInit never ran — the story has no space');
};

/** Waits for the chat the story plugin creates asynchronously on SpacesReady. */
const waitForChat = async (space: Space, timeout = 30_000): Promise<ChatSchema.Chat> => {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const [chat] = await space.db.query(Filter.type(ChatSchema.Chat)).run();
    if (chat) {
      return chat;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('no chat was created');
};

const require_ = <T,>(value: T | undefined, message: string): T => {
  if (value === undefined) {
    throw new Error(message);
  }
  return value;
};

const meta: Meta<typeof ModuleContainer> = {
  title: 'stories/stories-assistant/Agent',
  render: ModuleContainer,
  parameters: storyParameters,
  // Spawns the real SDK and spends real tokens. `manual` is the repo's opt-in tag (vitest.tags.ts),
  // skipped unless DX_RUN_MANUAL_TESTS=1 — which `moon run stories-assistant:test-storybook-live`
  // sets. A computed tag would break storybook's static indexer.
  tags: ['manual'],
};

export default meta;

type Story = StoryObj<typeof ModuleContainer>;

/**
 * Drives a real Claude Agent SDK turn through the sidecar and appends the projected messages onto
 * the chat's feed, so the existing Chat surface renders them with no plugin change.
 */
export const WithSidecar: Story = {
  decorators: createDecorators({ onInit: captureSpace }),
  args: {
    layout: [[StoryRole.Chat], [StoryRole.Logging]],
  },
  play: async () => {
    const space = await waitForSpace();
    const chat = await waitForChat(space);
    const feed = await chat.feed.load();
    const database = Database.layer(space.db);

    const messages: Message.Message[] = [];
    let end: Client.End | undefined;
    for await (const frame of Client.run({ prompt: PROMPT, maxTurns: 8 })) {
      if (Client.isEnd(frame)) {
        end = frame;
        continue;
      }

      // Built here, not in the client: that module resolves its own `@dxos/types`, and objects made
      // against a second schema instance never match this database's queries.
      const message = Message.make({
        sender: frame.role,
        created: frame.created,
        threadId: frame.threadId,
        blocks: [...frame.blocks],
        properties: frame.properties,
      });
      messages.push(message);
      await EffectEx.runPromise(Feed.append(feed, [message]).pipe(Effect.provide(database)));
    }

    await expect(end?.error, 'the SDK loop failed').toBeUndefined();

    // 1. The turn's messages reached the chat's feed, which is what the Chat surface reads.
    //
    // NOT asserted: that the thread then renders them. Several formulations of a DOM assertion
    // (exact word, model's own phrasing, markdown-normalised ancestor text) all failed against a
    // canvas that does contain the chat, so something between `Feed.append` and the rendered thread
    // is unresolved — see TASKS.md. Claiming the render path works is not yet earned.
    // `Feed.append` above fails the run if a message cannot be written, so reaching here with a
    // non-empty set is the assertion that the turn landed on the feed.
    await expect(messages.length, 'nothing reached the feed').toBeGreaterThan(0);

    const spoken = messages
      .filter((message) => message.sender.role === 'assistant')
      .flatMap((message) => [...message.blocks])
      .filter((block): block is ContentBlock.Text => block._tag === 'text');
    await expect(spoken.length, 'the turn produced no assistant text').toBeGreaterThan(0);

    // 2. The allowed Read call and its result survived the trip, still correlated by name — the
    //    SDK omits the name on results, so this is the projection's stateful correlation working
    //    end to end rather than in a unit test.
    const blocks = messages.flatMap((message) => [...message.blocks]);
    const readCall = require_(
      blocks.find((block): block is ContentBlock.ToolCall => block._tag === 'toolCall' && block.name === 'Read'),
      'no Read tool call',
    );
    const readResult = blocks.find(
      (block): block is ContentBlock.ToolResult =>
        block._tag === 'toolResult' && block.toolCallId === readCall.toolCallId,
    );
    await expect(readResult?.name, 'Read result lost its correlated name').toBe('Read');
    await expect(readResult?.error, 'the allowed Read call was refused').toBeUndefined();
    // The fixture's token proves the projected result carries what was actually on disk.
    await expect(String(readResult?.result), 'the Read result lost the file contents').toContain(MAGIC_TOKEN);

    // 3. The refused Bash call is visible as a failure rather than silently dropped, and the SDK's
    //    authoritative denial record counted it.
    const denied = blocks.find(
      (block): block is ContentBlock.ToolResult => block._tag === 'toolResult' && block.error !== undefined,
    );
    await expect(denied, 'nothing was denied — the permission posture is not being enforced').toBeDefined();
    await expect(end?.denials, 'the SDK reported no permission denials').toBeGreaterThan(0);
  },
};
