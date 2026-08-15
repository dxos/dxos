//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import { expect, within } from 'storybook/test';

import type { Wire } from '@dxos/agent-claude';
import { Chat as ChatSchema } from '@dxos/assistant-toolkit';
import { Database, Feed, Filter } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { type Space } from '@dxos/react-client/echo';
import { ContentBlock, Message } from '@dxos/types';

import { StoryRole } from '../modules';
import { ModuleContainer, createDecorators, storyParameters } from '../testing';

/** Mirrors `Middleware.PATH`; a value import would pull the node-only host into the browser bundle. */
const RUN_PATH = '/api/agent-claude/run';

/**
 * The turn asks for one allowed tool call (Read), one that the M1 permission posture must refuse
 * (Bash is absent from `allowedTools`, so `dontAsk` denies it), and a closing word to assert on.
 */
const PROMPT = [
  'Use the Read tool to read the file agent-fixture.md in the current directory.',
  'Then use the Bash tool to run: rm -rf /tmp/definitely-not-real',
  'Do not retry a tool that was denied; report what happened and stop.',
].join(' ');

// Captured by `onInit` so the play function can reach the space the story rendered.
let storySpace: Space | undefined;

const captureSpace = async ({ space }: { space: Space }) => {
  storySpace = space;
};

/** Streams a turn from the sidecar, yielding each NDJSON frame as it arrives. */
const runTurn = async function* (prompt: string): AsyncGenerator<Wire.WireFrame> {
  const response = await fetch(RUN_PATH, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ prompt, maxTurns: 8 }),
  });
  await expect(response.ok, `sidecar responded ${response.status}`).toBe(true);

  if (!response.body) {
    throw new Error('sidecar returned no body');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    // The trailing element is whatever arrived after the last newline — an incomplete frame.
    buffer = lines.pop() ?? '';
    for (const line of lines.filter(Boolean)) {
      yield JSON.parse(line);
    }
  }
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

const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const space = await waitForSpace();
    const chat = await waitForChat(space);
    const feed = await chat.feed.load();
    const database = Database.layer(space.db);

    const messages: Message.Message[] = [];
    let end: Wire.WireEnd | undefined;
    for await (const frame of runTurn(PROMPT)) {
      if ('end' in frame) {
        end = frame;
        continue;
      }

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

    // 1. The turn's text reached the rendered thread. Asserted against what the model actually said
    //    rather than an expected token — the path under test is projection -> feed -> render, and
    //    pinning exact wording would make a live model's phrasing a test dependency.
    const spoken = messages
      .filter((message) => message.sender.role === 'assistant')
      .flatMap((message) => [...message.blocks])
      .filter((block): block is ContentBlock.Text => block._tag === 'text')
      .map((block) => block.text.trim())
      .filter(Boolean);
    const lastSpoken = require_(spoken.at(-1), 'the turn produced no assistant text');
    await canvas.findByText(new RegExp(escapeRegExp(lastSpoken.slice(0, 40))), undefined, { timeout: 30_000 });

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

    // 3. The refused Bash call is visible as a failure rather than silently dropped, and the SDK's
    //    authoritative denial record counted it.
    const denied = blocks.find(
      (block): block is ContentBlock.ToolResult => block._tag === 'toolResult' && block.error !== undefined,
    );
    await expect(denied, 'nothing was denied — the permission posture is not being enforced').toBeDefined();
    await expect(end?.denials, 'the SDK reported no permission denials').toBeGreaterThan(0);
  },
};
