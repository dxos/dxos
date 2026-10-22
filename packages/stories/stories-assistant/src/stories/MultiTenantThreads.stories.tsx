//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Atom from 'effect/reactivity/Atom';
import { expect, within } from 'storybook/test';

import { Model } from '@dxos/ai';
import { ScriptedLanguageModel } from '@dxos/ai/testing';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import { TrajectoryStore } from '@dxos/assistant';
import * as Operation from '@dxos/compute/Operation';
import { Filter, Obj, Ref } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import * as AssistantCapabilities from '@dxos/plugin-assistant/AssistantCapabilities';
import * as AssistantSkill from '@dxos/plugin-assistant/AssistantSkill';
import * as AcpAgent from '@dxos/plugin-claude/AcpAgent';
import * as DrawingSkill from '@dxos/plugin-illustrator/DrawingSkill';
import { Cell } from '@dxos/storybook-testing';
import { Message } from '@dxos/types';

import { StoryRole } from '../modules/index.ts';
import {
  Calculate,
  CalculatorSkill,
  ModuleContainer,
  addToRootCollection,
  createDecorators,
  storyParameters,
  submitPrompt,
} from '../testing/index.ts';

const { text, reasoning, toolCall } = ScriptedLanguageModel;

/**
 * Agent multi-tenancy over light threads: two agents work in one chat. Composer's assistant (on DeepSeek V4 Flash)
 * takes plain prompts; a prompt starting with `@claude` goes to Claude Code. Each agent's work runs in lanes it owns,
 * with the same gutters, cards and notices as one agent's light threads, and each sees what the other is doing. Both
 * agents are scripted stand-ins: this sandbox has no Claude Code credentials, and storybook cannot host the ACP
 * adapter's process. See `packages/core/compute/trajectory/LIGHT-THREADS.mdl` QA-2.
 */
const meta: Meta<typeof ModuleContainer> = {
  title: 'stories/stories-assistant/MultiTenantThreads',
  render: ModuleContainer,
  parameters: storyParameters,
};

export default meta;

type Story = StoryObj<typeof meta>;

/** The prompts the demo sends, in order. */
const PROMPTS = {
  plan: 'Draft a three-step plan for migrating the chat store to events.',
  claude: '@claude Find where TrajectoryStore folds the prompt and list the files.',
  quick: 'Meanwhile, how many events does a turn write at least?',
} as const;

/** A status line the runtime appends about other threads; never the request itself. */
const isStatusLine = (value: string) => /^Thread \S+ .* is (running|done)/.test(value);

/** The request a call answers: the last text of the last user message that is not a status line or a snapshot. */
const currentRequest = ({ prompt }: ScriptedLanguageModel.ScriptedRequest): { text: string; index: number } => {
  for (let index = prompt.content.length - 1; index >= 0; index--) {
    const message = prompt.content[index];
    if (message.role !== 'user') {
      continue;
    }
    const parts =
      typeof message.content === 'string'
        ? [message.content]
        : message.content.flatMap((part) => (part.type === 'text' ? [part.text] : []));
    const request = parts.filter((part) => !isStatusLine(part) && !part.includes('<thread ')).at(-1);
    if (request !== undefined) {
      return { text: request, index };
    }
  }
  return { text: '', index: -1 };
};

/** Tool results since the request: how far through its loop the call is. */
const toolResultsSince = ({ prompt }: ScriptedLanguageModel.ScriptedRequest, index: number) =>
  prompt.content.slice(index + 1).filter((message) => message.role === 'tool').length;

const CALCULATE = Operation.toolName(Calculate);

const PLAN = [
  '1. Write every new turn as trajectory events, keeping legacy records readable.',
  '2. Convert legacy feeds on read, never rewriting them.',
  '3. Cache folded state per trajectory so a reopen folds only the tail.',
];

/** DeepSeek V4 Flash, scripted: a slow plan worked out one step at a time, and a quick answer. */
const deepseek: ScriptedLanguageModel.ScriptedTurnGenerator = (request) => {
  // Side calls (chat naming) offer no tools.
  if (!request.tools.includes(CALCULATE)) {
    return { parts: [text('Two agents')] };
  }
  const { text: current, index } = currentRequest(request);
  if (current.includes('three-step plan')) {
    const step = toolResultsSince(request, index);
    if (step < PLAN.length) {
      return {
        // Slow enough that the prompts typed meanwhile all arrive while it still runs.
        delay: '9 seconds',
        parts: [
          reasoning(`Working out step ${step + 1}.`),
          text(`Step ${step + 1}…`),
          toolCall(CALCULATE, { expression: `${step + 1}` }),
        ],
      };
    }
    return { delay: '1 second', parts: [text(PLAN.join('\n'))] };
  }
  if (current.includes('how many events')) {
    return { delay: '1500 millis', parts: [text('At least three: turnBegin, the promptConsume, and turnEnd.')] };
  }
  return { parts: [text('Done.')] };
};

/** Claude Code, scripted: answers after a while, as it does after reading the code. */
const claudeCode: AssistantCapabilities.Agent['makeTurnProducer'] = ({ feed }) =>
  Effect.succeed({
    getSkills: () => [],
    runTurn: (request) => {
      const blocks =
        typeof request.prompt === 'string' ? [{ _tag: 'text' as const, text: request.prompt }] : [...request.prompt];
      return TrajectoryStore.turn(
        feed,
        {
          prompt: Message.make({ sender: { role: 'user' }, blocks }),
          source: request.source,
          model: request.model,
          thread: request.thread,
        },
        (append) =>
          Effect.gen(function* () {
            yield* Effect.sleep('6 seconds');
            const answer = Message.make({
              sender: { role: 'assistant', name: 'claude' },
              blocks: [
                {
                  _tag: 'text',
                  text: 'The prompt fold lives in `trajectory/src/Reducer.ts` (`promptFold`, `place`); `assistant/src/session/TrajectoryStore.ts` loads it through `TrajectoryCache`.',
                },
              ],
            });
            yield* append([answer]);
            return [answer];
          }),
      );
    },
  });

/** Registers the scripted Claude Code as an agent the chat shares its threads with. */
const ClaudeCodeStandIn = Plugin.define(
  Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.story.claudeStandIn'), name: 'Claude Code (scripted)' }),
).pipe(
  Plugin.addModule(
    Capability.inlineModule('ClaudeAgent', { provides: [AssistantCapabilities.Agent] }, () =>
      Effect.succeed([
        Capability.contribute(AssistantCapabilities.Agent, {
          id: 'claude',
          label: 'Claude Code (scripted)',
          icon: 'ph--terminal--regular',
          availability: Atom.make<AssistantCapabilities.AgentAvailability>({ available: true }),
          makeTurnProducer: claudeCode,
        }),
      ]),
    ),
  ),
  Plugin.make,
);

const decorators = () =>
  createDecorators({
    plugins: [ClaudeCodeStandIn()],
    skills: [CalculatorSkill.key],
    scripted: deepseek,
    assistantSettings: { parallelThreads: true, parallelThreadAgents: ['claude'] },
    onChatCreated: async ({ chat }) => {
      Obj.update(chat, (chat) => {
        chat.session = { ...chat.session, model: Model.deepseekV4Flash.id };
      });
    },
  });

/** Scripted: the plan runs on DeepSeek while Claude Code answers a request addressed to it, and a quick one lands. */
export const Scripted: Story = {
  decorators: decorators(),
  args: { layout: [[StoryRole.Chat]] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await submitPrompt(canvasElement, PROMPTS.plan);
    await canvas.findByText(/Step 1…/, {}, { timeout: 30_000 });
    await submitPrompt(canvasElement, PROMPTS.claude);
    await submitPrompt(canvasElement, PROMPTS.quick);
    await canvas.findByText(/At least three/, {}, { timeout: 30_000 });
    await canvas.findByText(/promptFold/, {}, { timeout: 30_000 });
    const headers = await canvas.findAllByTestId('chat.lane-header');
    await expect(headers.some((header) => header.textContent?.includes('claude'))).toBe(true);
  },
};

/** {@link Scripted} without its play function, for a recorded walkthrough that types the prompts itself. */
export const Demo: Story = {
  decorators: decorators(),
  args: { layout: [[StoryRole.Chat]] },
  tags: ['!test'],
};

//
// Live: both agents for real.
//

/**
 * The agent helper the live story connects Claude Code through, from the iframe URL: `helperPort`, `helperToken` and
 * `cwd` (the directory Claude Code works in). The helper is started outside the browser with the Anthropic key, since
 * a page cannot spawn processes.
 */
const helperParams = () => {
  const params = new URLSearchParams(globalThis.location?.search ?? '');
  const port = Number(params.get('helperPort'));
  const token = params.get('helperToken');
  const cwd = params.get('cwd');
  return Number.isInteger(port) && port > 0 && token && cwd ? { port, token, cwd } : undefined;
};

/** Claude Code over ACP, through the helper the URL names, editing files in its working directory. */
const ClaudeCodeLive = Plugin.define(
  Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.story.claudeLive'), name: 'Claude Code' }),
).pipe(
  Plugin.addModule(
    Capability.inlineModule('ClaudeAgent', { provides: [AssistantCapabilities.Agent] }, () =>
      Effect.succeed([
        Capability.contribute(AssistantCapabilities.Agent, {
          id: 'claude',
          label: 'Claude Code',
          icon: 'ph--terminal--regular',
          availability: Atom.make<AssistantCapabilities.AgentAvailability>(
            helperParams() ? { available: true } : { available: false, reason: 'No agent helper in the story URL.' },
          ),
          makeTurnProducer: (context) => {
            const helper = helperParams();
            if (!helper) {
              return Effect.die(new Error('Start the agent helper and pass helperPort, helperToken and cwd.'));
            }
            return Effect.flatMap(AcpAgent.Sessions.make(), (sessions) =>
              AcpAgent.makeTurnProducer({
                id: 'claude-code',
                sessions,
                connect: AcpAgent.connectTo({ port: helper.port, token: helper.token, agent: 'claude-code' }),
                workspace: () => Effect.succeed(helper.cwd),
                mode: () => 'acceptEdits',
              })(context),
            );
          },
        }),
      ]),
    ),
  ),
  Plugin.make,
);

/**
 * Two real agents in one chat: Composer's assistant on DeepSeek V4 Flash draws on the canvas beside the chat, while a
 * prompt starting with `@claude` runs Claude Code over ACP, editing files in its working directory. Needs the agent
 * helper running with an Anthropic key (`helperPort`, `helperToken`, `cwd` in the URL) and the remote AI service.
 */
export const Live: Story = {
  decorators: createDecorators({
    plugins: [ClaudeCodeLive()],
    lazyPlugins: async () => {
      const [{ Drawing }, IllustratorPlugin, TldrawPlugin] = await Promise.all([
        import('@dxos/plugin-illustrator'),
        import('@dxos/plugin-illustrator/IllustratorPlugin'),
        import('@dxos/plugin-tldraw/TldrawPlugin'),
      ]);
      return {
        plugins: [IllustratorPlugin.make(), TldrawPlugin.make()],
        types: [Drawing.Drawing, Drawing.Canvas],
      };
    },
    onInit: async ({ space }) => {
      const [{ Drawing }, { Tldraw }] = await Promise.all([
        import('@dxos/plugin-illustrator'),
        import('@dxos/plugin-tldraw'),
      ]);
      const drawing = space.db.add(
        Drawing.make({ name: 'Launch plan', canvas: Drawing.makeCanvas({ schema: Tldraw.TLDRAW_SCHEMA }) }),
      );
      addToRootCollection(space, [drawing]);
      return [[StoryRole.Chat], [Cell.article(drawing)]];
    },
    onChatCreated: async ({ db, chat, binder }) => {
      const { Drawing } = await import('@dxos/plugin-illustrator');
      const drawings = await db.query(Filter.type(Drawing.Drawing)).run();
      await binder.bind({ objects: drawings.map((drawing) => Ref.make(drawing)) });
      Obj.update(chat, (chat) => {
        chat.session = { ...chat.session, model: Model.deepseekV4Flash.id };
      });
    },
    skills: [AssistantSkill.key, DrawingSkill.key],
    assistantSettings: { parallelThreads: true, parallelThreadAgents: ['claude'] },
  }),
  tags: ['!test'],
};
