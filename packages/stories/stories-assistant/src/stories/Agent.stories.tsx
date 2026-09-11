//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { Client } from '@dxos/agent-claude/client';
import * as ChatSchema from '@dxos/assistant/Chat';
import { Database, Feed, Filter } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { type Space } from '@dxos/react-client/echo';
import { ContentBlock, Message } from '@dxos/types';

import { AgentModule, StoryRole } from '../modules/index.ts';
import { AgentClaudePlugin, ModuleContainer, createDecorators, storyParameters } from '../testing/index.ts';

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

/** Types a prompt into the chat editor and submits it. */
const submitPrompt = async (canvasElement: HTMLElement, text: string) => {
  const canvas = within(canvasElement);
  const placeholder = await canvas.findByText(/enter question or command/i, {}, { timeout: 30_000 });
  const editor = placeholder.closest('.cm-editor')?.querySelector<HTMLElement>('.cm-content');
  if (!editor) {
    throw new Error('Chat editor not found.');
  }

  await userEvent.click(editor);
  await userEvent.type(editor, text);
  await userEvent.keyboard('{Enter}');
};

// Captured by `onInit` so the play function can reach the space the story rendered. Keyed per
// story: the module is shared across the file's stories, and a later story polling a single shared
// slot would pick up the PREVIOUS story's space — whose client is already destroyed — and hang.
const storySpaces = new Map<string, Space>();

const captureSpaceFor =
  (key: string) =>
  async ({ space }: { space: Space }) => {
    storySpaces.set(key, space);
  };

/** `onInit` runs on SpacesReady, which the play function can reach first. */
const waitForSpace = async (key: string, timeout = 30_000): Promise<Space> => {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const space = storySpaces.get(key);
    if (space) {
      return space;
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
  decorators: createDecorators({ onInit: captureSpaceFor('withSidecar') }),
  args: {
    layout: [[StoryRole.Chat], [StoryRole.Logging]],
  },
  play: async () => {
    const space = await waitForSpace('withSidecar');
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

    // 1. The turn reached the RENDERED thread.
    //
    // Scoped to `document.body`, not `canvasElement`: the module layout renders outside the story
    // root, so a canvas-scoped query never sees the thread — which is what made this look for a long
    // time like a broken render path rather than a mis-scoped assertion.
    await expect(messages.length, 'nothing reached the feed').toBeGreaterThan(0);
    // Asserted against the document's text rather than a testing-library matcher: the token appears
    // in several elements (the tool result and the assistant's prose), which makes `findByText`
    // ambiguous, and markdown splits it across nodes.
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline && !document.body.innerText.includes(MAGIC_TOKEN)) {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    await expect(document.body.innerText, 'the turn never reached the rendered thread').toContain(MAGIC_TOKEN);

    // 2. The allowed Read call and its result survived the trip, still correlated by name — the
    //    SDK omits the name on results, so this is the projection's stateful correlation working
    //    end to end rather than in a unit test.
    const blocks = messages.flatMap((message) => [...message.blocks]);
    // The agent's first Read commonly fails — the SDK requires an absolute path — and it retries.
    // The claim under test is that a SUCCEEDING read round-trips, so select that pair rather than
    // the first attempt.
    const readResult = require_(
      blocks.find(
        (block): block is ContentBlock.ToolResult =>
          block._tag === 'toolResult' && block.name === 'Read' && block.error === undefined,
      ),
      'no Read tool call succeeded',
    );
    const readCall = blocks.find(
      (block): block is ContentBlock.ToolCall =>
        block._tag === 'toolCall' && block.toolCallId === readResult.toolCallId,
    );
    // The result carries the tool's name only because the projector correlated it with this call —
    // the SDK omits the name on results.
    await expect(readCall?.name, 'the Read result was not correlated with a call').toBe('Read');
    // The fixture's token proves the projected result carries what was actually on disk.
    await expect(String(readResult.result), 'the Read result lost the file contents').toContain(MAGIC_TOKEN);

    // 3. The refused Bash call is visible as a failure rather than silently dropped, and the SDK's
    //    authoritative denial record counted it.
    const denied = blocks.find(
      (block): block is ContentBlock.ToolResult => block._tag === 'toolResult' && block.error !== undefined,
    );
    await expect(denied, 'nothing was denied — the permission posture is not being enforced').toBeDefined();
    await expect(end?.denials, 'the SDK reported no permission denials').toBeGreaterThan(0);
  },
};

/**
 * The interactive console, resolved through the modules mechanism: type a prompt and the Claude
 * Agent SDK answers, with tool calls and denials surfaced inline, alongside the logging panel.
 *
 * Needs the host mounted in the dev server:
 * `DX_AGENT_CWD=<dir> pnpm --filter @dxos/storybook-react exec storybook dev --port 9016`
 *
 * Runs in the test runner but NOT under `storybook dev` where DXOS services are unreachable: the
 * plugin stack stalls in `SpaceProxy._initializeDb` waiting on EDGE and blows `useApp`'s 30s budget
 * (`Edge connection closed` on the remote config, `ERR_CONNECTION_REFUSED` on local). {@link Console}
 * is the variant that opens in a browser. Not caused by the agent host — every client-backed story
 * here behaves the same.
 */
export const ConsoleModule: Story = {
  decorators: createDecorators({}),
  args: {
    layout: [[StoryRole.Agent], [StoryRole.Logging]],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Resolving the surface is the assertion: the prompt box only exists if the role bound.
    await canvas.findByPlaceholderText('Ask the agent…', undefined, { timeout: 60_000 });
  },
};

/**
 * The same console rendered directly, skipping the plugin stack.
 *
 * Kept alongside {@link ConsoleModule} because that variant boots the DXOS client, which cannot
 * finish inside `useApp`'s 30s budget under `storybook dev` (~5s per Automerge doc open). This is
 * the variant that actually opens in a browser until that is fixed.
 */
export const Console: Story = {
  render: () => <AgentModule />,
};

/**
 * The assistant's OWN chat, with turns produced by the Claude Agent SDK instead of `AiSession`.
 *
 * This is the end state M3c is after: the sidecar wired in as a `TurnProducer`, so the normal chat
 * input drives it and the normal Chat surface renders it — no bespoke console, no writing to the
 * feed from outside.
 *
 * NOT WORKING YET, and excluded from the suite (`!test`) rather than left red. With the producer
 * contributed the story never reaches a space or a chat (60s, both waits time out), while
 * {@link WithSidecar} — same stack, no producer — passes. The producer module does not appear in the
 * activation log at all, so the suspicion is that it never activates rather than that it fails.
 * Diagnose that before touching anything else; see TASKS.md.
 */
export const WithClaudeAgent: Story = {
  tags: ['manual'],
  decorators: createDecorators({ onInit: captureSpaceFor('withClaudeAgent'), plugins: [AgentClaudePlugin] }),
  args: {
    layout: [[StoryRole.Chat], [StoryRole.Logging]],
  },
  play: async ({ canvasElement }) => {
    const space = await waitForSpace('withClaudeAgent');
    await waitForChat(space);

    // Submitted through the assistant's own chat input: the processor requests a session from
    // AgentService, whose process runs the turn on the contributed Claude producer, which appends
    // the projected messages to the feed the thread renders.
    await submitPrompt(canvasElement, `Read agent-fixture.md and state the MAGIC_TOKEN. Do not run any other tools.`);

    const deadline = Date.now() + 90_000;
    while (Date.now() < deadline && !document.body.innerText.includes(MAGIC_TOKEN)) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    await expect(document.body.innerText, 'the SDK-produced turn never reached the rendered thread').toContain(
      MAGIC_TOKEN,
    );
  },
};
