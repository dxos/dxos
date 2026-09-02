//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as LanguageModel from 'effect/unstable/ai/LanguageModel';
import React from 'react';
import { expect, userEvent, waitFor } from 'storybook/test';

import { type AiService } from '@dxos/ai';
import { ScriptedLanguageModel, SERVICES_CONFIG } from '@dxos/ai/testing';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { withPluginManager } from '@dxos/app-framework/testing';
import { AiContext } from '@dxos/assistant';
import { Chat, PlanningSkill } from '@dxos/assistant-toolkit';
import { capabilities } from '@dxos/assistant-toolkit/testing';
import * as Skill from '@dxos/compute/Skill';
import { Database, Feed, Filter, Ref } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import * as DeckCapabilities from '@dxos/plugin-deck/DeckCapabilities';
import { PreviewPlugin } from '@dxos/plugin-preview/testing';
import { RoutinePlugin } from '@dxos/plugin-routine/testing';
import { SpacePlugin } from '@dxos/plugin-space/testing';
import * as TasksPlugin from '@dxos/plugin-tasks/TasksPlugin';
import { corePlugins } from '@dxos/plugin-testing';
import * as StorybookPlugin from '@dxos/plugin-testing/StorybookPlugin';
import { Config } from '@dxos/react-client';
import { useSpaces } from '@dxos/react-client/echo';
import { Loading, withTheme } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';
import { Message, Outline, Task } from '@dxos/types';

import { AssistantPlugin } from '#plugin';
import { translations } from '#translations';

import { ChatArticle, ChatArticleProps } from './ChatArticle';

/**
 * Replaces the AI service the plugin would build with a scripted model, so a story can drive the real
 * request loop offline and deterministically.
 *
 * The model is built **once** and shared across requests. Constructing it per request — the obvious
 * shape, since `model()` returns a layer — gives each request its own cursor, so every turn replays the
 * first reply and a multi-turn story silently answers itself wrongly.
 *
 * Inert until something submits: the model is only consulted on a request, so stories that never submit
 * are unaffected. The script is exhausted rather than looped, so submitting more often than there are
 * replies fails loudly instead of hanging.
 */
const scriptedAiServiceMiddleware = (replies: readonly string[]) => {
  const model = Effect.runSync(
    ScriptedLanguageModel.makeScriptedLanguageModel(
      replies.map((reply) => ({ parts: [ScriptedLanguageModel.text(reply)] })),
    ),
  );
  const layer = Layer.succeed(LanguageModel.LanguageModel, model);
  return (_upstream: AiService.Service) => ({ model: () => layer });
};

/**
 * Types into the chat prompt, leaving it unsubmitted.
 *
 * The thread renders its own CodeMirror instance (read-only, but still `contenteditable`), so an
 * unscoped `.cm-content` lookup is ambiguous; `ChatPrompt` wraps the real editor in a `role="group"`.
 */
const typePrompt = async (canvasElement: HTMLElement, text: string) => {
  const content = await waitFor(
    () => {
      const element = canvasElement.querySelector<HTMLElement>('[role="group"] .cm-content');
      if (!element) {
        throw new Error('Prompt editor not found.');
      }
      return element;
    },
    { timeout: 15_000, interval: 300 },
  );

  await userEvent.click(content);
  await userEvent.type(content, text);
};

/** Types into the chat prompt and submits it the way a hardware keyboard would. */
const submitPrompt = async (canvasElement: HTMLElement, text: string) => {
  await typePrompt(canvasElement, text);
  await userEvent.keyboard('{Enter}');
};

const sendButton = (canvasElement: HTMLElement) => {
  const button = canvasElement.querySelector<HTMLButtonElement>('[data-testid="assistant.send"]');
  if (!button) {
    throw new Error('Send button not found.');
  }
  return button;
};

/** Two turns: the marker rail needs two prompts to appear, and the status pill needs one to finish. */
const TWO_TURNS = [
  { prompt: 'Hello', reply: 'Hi — how can I help?' },
  { prompt: 'What is a feed?', reply: 'A feed is an append-only log.' },
];

const driveTurns = async (canvasElement: HTMLElement, messages: { prompt: string; reply: string }[]) => {
  for (const { prompt, reply } of messages) {
    await submitPrompt(canvasElement, prompt);
    await waitFor(() => void expect(threadText(canvasElement)).toContain(reply), { timeout: 15_000, interval: 200 });
  }
};

/** The chrome the desktop shell wraps the thread in, all of which the mobile app drops. */
const desktopOnlyChrome = (canvasElement: HTMLElement) => ({
  outlineRail: canvasElement.querySelector('[role="navigation"]'),
  statusPill: canvasElement.querySelector('[data-testid="assistant.chat-status"]'),
});

type StoryArgs = {
  /** Turns the story drives: each prompt is submitted, and its reply is what the scripted model returns. */
  messages?: { prompt: string; reply: string }[];
  /** Seed the chat's checklist, so the article renders its `Chat.TaskList`. */
  tasks?: { title: string; status?: Task.Task['status'] }[];
  /** Contributes the deck's platform capability, which the prompt reads to drop desktop-only affordances. */
  platform?: DeckCapabilities.Platform;
} & Pick<ChatArticleProps, 'debug'>;

const DefaultStory = ({ debug }: StoryArgs) => {
  const [space] = useSpaces();
  const [chat] = useQuery(space?.db, Filter.type(Chat.Chat));
  if (!chat) {
    return <Loading />;
  }

  return <ChatArticle role='article' subject={chat} attendableId='story' debug={debug} />;
};

const meta = {
  title: 'plugins/plugin-assistant/containers/ChatArticle',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withPluginManager<StoryArgs>(({ args: { messages = [], tasks = [], platform } }) => {
      return {
        plugins: [
          ...corePlugins(),
          ClientPlugin.make({
            types: [Chat.Chat, Feed.Feed, Message.Message, Outline.Outline, Task.Task, Text.Text],
            config: new Config({ runtime: { services: SERVICES_CONFIG.REMOTE } }),
            onClientInitialized: ({ client }) =>
              Effect.gen(function* () {
                yield* initializeIdentity(client);
                const [space] = client.spaces.get();
                yield* Effect.promise(() => space.waitUntilReady());
                const feed = space.db.add(Feed.make());
                const chat = space.db.add(Chat.make({ name: 'Test', feed: Ref.make(feed) }));
                for (const { title, status } of tasks) {
                  Chat.addTask(space.db, chat, title, { status });
                }
                // The task list reads the rows through resolve-once ref atoms; load them so the
                // story renders without waiting on a lazy resolution nothing triggers.
                yield* Effect.promise(() => Promise.all(chat.tasks.map((task) => task.load())));

                if (tasks.length > 0) {
                  // Bind the conversation the way `CreateChat` binds a new chat's defaults, because
                  // holding tasks is not the same as working them: the planning skill's update-tasks
                  // tool and its end-request reminder both reach the checklist through
                  // `Chat.getFromContext`, so without the chat in context the model gets the tool and
                  // no list to apply it to.
                  const registry = yield* Capability.get(Capabilities.AtomRegistry);
                  const runtime = yield* Effect.context<Database.Service>().pipe(
                    Effect.provide(Database.layer(space.db)),
                  );
                  const binder = new AiContext.Binder({ feed, runtime, registry });
                  yield* Effect.promise(() =>
                    binder.use((binder: AiContext.Binder) =>
                      binder.bind({
                        skills: [Ref.fromURI(Skill.registryURI(PlanningSkill.key))],
                        objects: [Ref.make(chat)],
                      }),
                    ),
                  );
                }

                yield* Effect.promise(() => space.db.flush({ indexes: true }));
              }),
          }),
          RoutinePlugin(),
          AssistantPlugin({
            // Only the stories that declare their turns are scripted; the rest keep the real service, so
            // `Default` stays a place to actually talk to a model rather than one with an empty script.
            aiServiceMiddleware:
              messages.length > 0 ? scriptedAiServiceMiddleware(messages.map(({ reply }) => reply)) : undefined,
          }),
          PreviewPlugin.make(),
          // The assistant contributes the database SKILL unconditionally, but its tools resolve to
          // operations this plugin owns. Without it the system prompt advertises `space-*` tools the
          // toolkit cannot build, and the first turn that takes the model up on one dies with
          // ToolNotFoundError.
          SpacePlugin({}),
          // Contributes the task verbs the `/task:*` commands invoke.
          TasksPlugin.make(),
          StorybookPlugin.make({}),
        ],
        // Contributed directly rather than by loading the deck plugin: the prompt reads only this
        // one value, so a story can stand in for the mobile shell without its layout.
        capabilities: platform
          ? [...capabilities, Capability.contribute(DeckCapabilities.Platform, platform)]
          : capabilities,
      };
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
    debug: false,
  },
};

/**
 * The article's working tasks, and the disclosure that shows them.
 *
 * The checklist is `Chat.Prompt`'s own collapsible region rather than a sibling the article places,
 * so the toggle in the composer's action bar is the only thing that opens and closes it — this is
 * what asserts that wiring, since the button is not the collapsible's own trigger.
 */
export const Tasks: Story = {
  args: {
    tasks: [
      { title: 'Gather the requirements', status: 'done' },
      { title: 'Draft the plan', status: 'done' },
      { title: 'Implement the change', status: 'started' },
      { title: 'Verify and ship', status: 'todo' },
    ],
  },
  play: async ({ canvasElement }) => {
    await waitFor(() => void expect(canvasElement.textContent ?? '').toContain('Implement the change'), {
      timeout: 10_000,
      interval: 300,
    });
    await expect(canvasElement.textContent ?? '').toContain('Gather the requirements');

    // Disclosed on mount, and the toggle reports it. Asserted on `hidden` rather than `data-state`:
    // the machine only stamps that once it has run a transition, so a region open from the first
    // render carries no state attribute at all.
    const region = () => canvasElement.querySelector<HTMLElement>('[data-scope="collapsible"][data-part="content"]')!;
    const toggle = () => canvasElement.querySelector<HTMLElement>('[data-testid="assistant.toggle-tasks"]')!;
    await expect(region()).not.toHaveAttribute('hidden');
    await expect(toggle()).toHaveAttribute('aria-pressed', 'true');

    // Closing hides the region rather than unmounting it — the list keeps its subscriptions, so
    // reopening shows the checklist it already had rather than refetching it.
    await userEvent.click(toggle());
    await waitFor(() => void expect(region()).toHaveAttribute('hidden'), { timeout: 10_000 });
    await expect(toggle()).toHaveAttribute('aria-pressed', 'false');
    await expect(region().textContent ?? '').toContain('Gather the requirements');

    await userEvent.click(toggle());
    await waitFor(() => void expect(region()).not.toHaveAttribute('hidden'), { timeout: 10_000 });
    await expect(toggle()).toHaveAttribute('aria-pressed', 'true');
  },
};

/**
 * Drives the real request loop against the scripted model — no network and no seeded feed. This is the
 * precondition for exercising rewind against turns the app itself produced.
 */
export const Scripted: Story = {
  args: {
    messages: [
      {
        prompt: 'What is a feed?',
        reply: 'A feed is an append-only log.',
      },
    ],
  },
  play: async ({ canvasElement, args: { messages = [] } }) => {
    const { prompt, reply } = messages[0];
    await submitPrompt(canvasElement, prompt);
    await waitFor(() => void expect(canvasElement.textContent ?? '').toContain(reply), {
      timeout: 20_000,
      interval: 300,
    });
  },
};

/**
 * The send control, which is the only way to submit where Enter is not an affordance (a touch
 * keyboard). Driven through the real request loop so a regression that leaves the button inert fails
 * here rather than only on device.
 */
export const Send: Story = {
  args: {
    messages: [{ prompt: 'What is a feed?', reply: 'A feed is an append-only log.' }],
  },
  play: async ({ canvasElement, args: { messages = [] } }) => {
    const { prompt, reply } = messages[0];

    // Nothing to send yet.
    await waitFor(() => void expect(sendButton(canvasElement).disabled).toBe(true), {
      timeout: 15_000,
      interval: 300,
    });

    await typePrompt(canvasElement, prompt);
    await waitFor(() => void expect(sendButton(canvasElement).disabled).toBe(false), {
      timeout: 5_000,
      interval: 100,
    });

    await userEvent.click(sendButton(canvasElement));

    await waitFor(() => void expect(threadText(canvasElement)).toContain(reply), { timeout: 20_000, interval: 300 });
    await expect(threadText(canvasElement)).toContain(prompt);

    // The composer resets, so the control returns to its empty state (the placeholder is all that is
    // left in the editor, hence a negative assertion rather than an emptiness one).
    await expect(composerText(canvasElement)).not.toContain(prompt);
    await waitFor(() => void expect(sendButton(canvasElement).disabled).toBe(true), { timeout: 5_000, interval: 100 });
  },
};

/**
 * Submitting again without waiting for the running turn: the second prompt is QUEUED on the feed and
 * runs after the first, rather than being dropped (the composer used to ignore a submit while a turn
 * was active) or cancelling the turn in flight (`processor.request` interrupts, `enqueue` does not).
 *
 * Deliberately no wait between the two submits — that is the whole case. Both replies landing is what
 * proves the second prompt survived; the agent-level ordering and mid-turn arrival are pinned
 * deterministically in `agent-runtime`'s `queue-scripted.test.ts`.
 */
export const QueueWhileProcessing: Story = {
  args: {
    messages: [
      { prompt: 'First question', reply: 'The first answer.' },
      { prompt: 'Second question', reply: 'The second answer.' },
    ],
  },
  play: async ({ canvasElement, args: { messages = [] } }) => {
    await submitPrompt(canvasElement, messages[0].prompt);
    // No `waitFor` on the first reply: this submit is meant to land while the first turn is running.
    await submitPrompt(canvasElement, messages[1].prompt);

    for (const { prompt, reply } of messages) {
      await waitFor(() => void expect(threadText(canvasElement)).toContain(reply), {
        timeout: 30_000,
        interval: 300,
      });
      await expect(threadText(canvasElement)).toContain(prompt);
    }
  },
};

/**
 * The desktop baseline for the platform-gated chrome: after two turns the marker rail and the
 * floating status pill are both present. Without this, `MobilePlatform`'s absence assertions would
 * pass against a thread that never rendered them in the first place.
 */
export const DesktopPlatform: Story = {
  args: {
    platform: 'desktop',
    messages: TWO_TURNS,
  },
  play: async ({ canvasElement, args: { messages = [] } }) => {
    await driveTurns(canvasElement, messages);
    await waitFor(
      () => {
        const { outlineRail, statusPill } = desktopOnlyChrome(canvasElement);
        void expect(outlineRail).not.toBeNull();
        // Non-empty, not merely present: the wrapper renders whether or not the pill has anything
        // to report, so its text is what proves the pill itself rendered.
        void expect(statusPill?.textContent ?? '').not.toBe('');
      },
      { timeout: 10_000, interval: 200 },
    );
  },
};

/**
 * The mobile app's treatment of the same thread. The marker rail (a precision target pinned outside
 * the text column) and the floating status pill (which would cover the reply it reports on) are
 * dropped; the send control stays, being the only submit affordance a touch keyboard has. Keyed to
 * the platform, not the viewport, so a narrowed desktop window is unaffected.
 */
export const MobilePlatform: Story = {
  args: {
    platform: 'mobile',
    messages: TWO_TURNS,
  },
  play: async ({ canvasElement, args: { messages = [] } }) => {
    await driveTurns(canvasElement, messages);

    const { outlineRail, statusPill } = desktopOnlyChrome(canvasElement);
    await expect(outlineRail).toBeNull();
    await expect(statusPill).toBeNull();

    await expect(sendButton(canvasElement)).toBeTruthy();
  },
};

/**
 * Soft fork ("rewind") driven entirely through the UI, over a realistic conversation: a greeting, then a
 * question, then a rewind of that question, then the same question asked differently.
 *
 * Rewinding is edit-and-resend: the prompt and its answer both leave the thread and the prompt text comes
 * back in the composer. The greeting survives, because it precedes the rewind point. The resend then
 * continues from the greeting, so the abandoned pair never rejoins the conversation.
 */
export const Rewind: Story = {
  args: {
    messages: [
      { prompt: 'Hello', reply: 'Hi — how can I help?' },
      { prompt: 'What is a feed?', reply: 'A feed is an append-only log.' },
      { prompt: 'What is a feed, in one sentence?', reply: 'An append-only log of immutable blocks.' },
    ],
  },
  play: async ({ canvasElement, args: { messages = [] } }) => {
    const [greeting, asked, revised] = messages;
    const toolbars = () => canvasElement.querySelectorAll<HTMLElement>('[data-testid="chat.rewind"]');

    // Greeting, then the question.
    await submitPrompt(canvasElement, greeting.prompt);
    await waitFor(() => void expect(threadText(canvasElement)).toContain(greeting.reply), {
      timeout: 8_000,
      interval: 200,
    });
    await submitPrompt(canvasElement, asked.prompt);
    await waitFor(() => void expect(threadText(canvasElement)).toContain(asked.reply), {
      timeout: 8_000,
      interval: 200,
    });

    // Let the reply finish streaming, so the rewind forks a settled turn.
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    await waitFor(() => void expect(toolbars()).toHaveLength(2), { timeout: 5_000, interval: 200 });

    // Rewind the question — the second prompt's toolbar.
    toolbars()[1].click();

    // The question and its answer leave the thread, and the greeting is untouched.
    await waitFor(() => void expect(threadText(canvasElement)).not.toContain(asked.reply), {
      timeout: 5_000,
      interval: 200,
    });
    await expect(threadText(canvasElement)).not.toContain(asked.prompt);
    await expect(threadText(canvasElement)).toContain(greeting.prompt);
    await expect(threadText(canvasElement)).toContain(greeting.reply);

    // Edit-and-resend: the question comes back in the composer, ready to be revised.
    await expect(composerText(canvasElement)).toContain(asked.prompt);

    // Ask it differently. The answer continues from the greeting, so the abandoned pair stays gone.
    await clearPrompt(canvasElement);
    await submitPrompt(canvasElement, revised.prompt);
    await waitFor(() => void expect(threadText(canvasElement)).toContain(revised.reply), {
      timeout: 8_000,
      interval: 200,
    });
    await expect(threadText(canvasElement)).toContain(revised.prompt);
    await expect(threadText(canvasElement)).not.toContain(asked.reply);
  },
};

/**
 * The rendered conversation, excluding the composer — both are CodeMirror instances, and the composer
 * holds the restored prompt after a rewind, so an unscoped read cannot tell "still in the thread" from
 * "waiting to be resent".
 */
const threadText = (canvasElement: HTMLElement) =>
  Array.from(canvasElement.querySelectorAll<HTMLElement>('.cm-content'))
    .filter((element) => !element.closest('[role="group"]'))
    .map((element) => element.textContent ?? '')
    .join('\n');

const composerText = (canvasElement: HTMLElement) =>
  canvasElement.querySelector<HTMLElement>('[role="group"] .cm-content')?.textContent ?? '';

/** Empties the composer, so a restored prompt can be replaced rather than appended to. */
const clearPrompt = async (canvasElement: HTMLElement) => {
  const content = canvasElement.querySelector<HTMLElement>('[role="group"] .cm-content');
  if (content) {
    await userEvent.click(content);
    await userEvent.keyboard('{Control>}a{/Control}{Backspace}');
  }
};
