//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';

import { Model } from '@dxos/ai';
import { ScriptedLanguageModel } from '@dxos/ai/testing';
import * as Operation from '@dxos/compute/Operation';
import { type Database, Filter, Obj } from '@dxos/echo';
import * as AgentPlugin from '@dxos/plugin-agent/AgentPlugin';
import * as Goal from '@dxos/plugin-agent/Goal';
import * as Memory from '@dxos/plugin-agent/Memory';
import * as MemoryOperation from '@dxos/plugin-agent/MemoryOperation';
import { translations as agentTranslations } from '@dxos/plugin-agent/translations';
import { HasSubject, Organization, Person, ProfileOf } from '@dxos/types';

import { StoryRole } from '../modules/index.ts';
import { ModuleContainer, createDecorators, storyParameters, submitPrompt } from '../testing/index.ts';

const meta: Meta<typeof ModuleContainer> = {
  title: 'stories/stories-assistant/Interview',
  render: ModuleContainer,
  parameters: {
    ...storyParameters,
    translations: [...storyParameters.translations, ...agentTranslations],
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

const { text, toolCall, promptIncludes } = ScriptedLanguageModel;

const tool = Operation.toolName;

// Not exported by plugin-agent, whose skills module is internal.
const INTERVIEW_SKILL_KEY = 'org.dxos.skill.interview';

const PERSON_NAME = 'Rich Burdon';

const GOALS = {
  demo: 'Autonomous agent demo working end to end',
  hiring: 'Hire two engineers',
} as const;

const MEMORIES = {
  demo: 'Rich wants the autonomous agent demo working end to end by the end of October.',
  hiring: 'Rich wants to hire two engineers this quarter.',
  blocker: 'The Discord bot on EDGE is blocking the autonomous agent demo.',
} as const;

const PROMPTS = [
  'Hi, I am Rich.',
  'I want the autonomous agent demo working end to end by the end of October, and to hire two engineers this quarter.',
  'The blocker is the Discord bot on EDGE.',
  'Yes, both are right.',
] as const;

// Captured from the harness that runs the agent (not `onInit`, whose space may belong to another client
// instance) so assertions read the objects the operations write. Every capture is kept: the file's
// stories share this module, and a previous story's harness can finish setting up after the next
// story's, so the latest capture is not necessarily the one under test.
const storyDbs: Database.Database[] = [];

const captureDatabase = async ({ db }: { db: Database.Database }) => {
  storyDbs.push(db);
};

// The interviewer route's latest request, recorded by its `match` (which runs just before the turn
// is emitted) so deferred tool inputs can read refs out of earlier tool results.
let lastRequest: ScriptedLanguageModel.ScriptedRequest | undefined;

/** The ref URIs under `field` in every `toolName` result so far, in call order. */
const resultRefs = (toolName: string, field: string): string[] => {
  const pattern = new RegExp(`"${field}"\\s*:\\s*(?:\\{\\s*"/"\\s*:\\s*)?"([^"]+)"`);
  const uris: string[] = [];
  for (const message of lastRequest?.prompt.content ?? []) {
    if (message.role !== 'tool') {
      continue;
    }
    for (const part of message.content) {
      if (part.type !== 'tool-result' || part.name !== toolName) {
        continue;
      }
      const match = (typeof part.result === 'string' ? part.result : JSON.stringify(part.result)).match(pattern);
      if (match) {
        uris.push(match[1]);
      } else {
        throw new Error(`No ${field} ref in ${toolName} result: ${JSON.stringify(part.result)}`);
      }
    }
  }
  return uris;
};

/** The interviewee, read from the ResolveEntity result rather than a query the index may not have caught up with. */
const personRef = (): string => {
  const [uri] = resultRefs(tool(MemoryOperation.ResolveEntity), 'entity');
  if (!uri) {
    throw new Error('ResolveEntity has not returned the interviewee yet.');
  }
  return uri;
};

/** The goal proposed `index`-th (in script order), read from the ProposeGoal results. */
const goalRef = (index: number): string => {
  const uri = resultRefs(tool(MemoryOperation.ProposeGoal), 'goal')[index];
  if (!uri) {
    throw new Error(`ProposeGoal has not returned goal ${index}.`);
  }
  return uri;
};

/** Two model calls per user message: the tool calls the answer warrants, then the reply. */
const interviewerTurns: ScriptedLanguageModel.ScriptedTurn[] = [
  // 1. Introduction.
  { parts: [toolCall(tool(MemoryOperation.ResolveEntity), { name: PERSON_NAME })] },
  {
    parts: [
      text(
        'Nice to meet you, Rich. I would like to learn about your work and goals so I can help. What are you focused on right now?',
      ),
    ],
  },
  // 2. Goals.
  {
    parts: [
      toolCall(tool(MemoryOperation.Remember), () => ({
        content: MEMORIES.demo,
        kind: 'goal',
        origin: 'stated',
        subjects: [personRef()],
      })),
      toolCall(tool(MemoryOperation.Remember), () => ({
        content: MEMORIES.hiring,
        kind: 'goal',
        origin: 'stated',
        subjects: [personRef()],
      })),
      toolCall(tool(MemoryOperation.ProposeGoal), () => ({
        title: GOALS.demo,
        description: 'By the end of October.',
        horizon: 'quarter',
        owners: [personRef()],
      })),
      toolCall(tool(MemoryOperation.ProposeGoal), () => ({
        title: GOALS.hiring,
        horizon: 'quarter',
        owners: [personRef()],
      })),
    ],
  },
  {
    parts: [
      text(
        'So you are aiming for an end-to-end demo by late October and two new engineers this quarter. What is in the way?',
      ),
    ],
  },
  // 3. Obstacles.
  {
    parts: [
      toolCall(tool(MemoryOperation.Remember), () => ({
        content: MEMORIES.blocker,
        kind: 'fact',
        origin: 'stated',
        subjects: [personRef()],
      })),
    ],
  },
  {
    parts: [text(`Noted. To confirm, your goals are: "${GOALS.demo}" and "${GOALS.hiring}". Are both right?`)],
  },
  // 4. Confirmation.
  {
    parts: [
      toolCall(tool(MemoryOperation.ConfirmGoal), () => ({ goal: goalRef(0) })),
      toolCall(tool(MemoryOperation.ConfirmGoal), () => ({ goal: goalRef(1) })),
      toolCall(tool(MemoryOperation.UpdateProfile), () => ({ subject: personRef() })),
    ],
  },
  { parts: [text('Thanks, Rich. I confirmed both goals, recorded three memories and updated your profile.')] },
];

const INTERVIEW_TYPES = [
  Person.Person,
  Organization.Organization,
  HasSubject.HasSubject,
  Memory.Memory,
  Goal.Goal,
  ProfileOf.ProfileOf,
];

const INTERLOCUTOR = {
  name: 'Interlocutor',
  instructions: 'You interview the people you talk to and remember what you learn about them.',
};

const decorators = createDecorators({
  createAgent: INTERLOCUTOR,
  plugins: [AgentPlugin.make()],
  types: INTERVIEW_TYPES,
  skills: [INTERVIEW_SKILL_KEY],
  onChatCreated: captureDatabase,
  scripted: [
    {
      name: 'chat-name',
      match: promptIncludes('Suggest a name for this chat'),
      turns: [{ parts: [text('Interview')] }],
    },
    {
      name: 'interviewer',
      match: (request) => {
        lastRequest = request;
        return true;
      },
      turns: interviewerTurns,
    },
  ],
});

type SpaceSummary = {
  people: string[];
  goals: { title: string; status: Goal.Status }[];
  memories: number;
};

/** What the interview has written, as plain data so a failed wait can report it. */
const summarize = async (db: Database.Database): Promise<SpaceSummary> => {
  const people = await db.query(Filter.type(Person.Person)).run();
  const goals = await db.query(Filter.type(Goal.Goal)).run();
  const memories = await db.query(Filter.type(Memory.Memory)).run();
  return {
    people: people.map(({ fullName }) => fullName ?? ''),
    goals: goals.map(({ title, status }) => ({ title, status })),
    memories: memories.length,
  };
};

/** Polls the space until `predicate` holds, so assertions do not race the agent's writes. */
const waitForSpace = async (
  predicate: (summary: SpaceSummary) => boolean,
  { timeout = 30_000 }: { timeout?: number } = {},
): Promise<void> => {
  const deadline = Date.now() + timeout;
  let summary: SpaceSummary | undefined;
  while (Date.now() < deadline) {
    for (const db of [...storyDbs].reverse()) {
      // A finished story's client is closed, so its database may no longer answer.
      const candidate = await summarize(db).catch(() => undefined);
      if (candidate && predicate(candidate)) {
        return;
      }
      summary = candidate ?? summary;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`The space never reached the expected state; last saw: ${JSON.stringify(summary)}`);
};

/**
 * An autonomous agent with the interview skill, driven by a scripted model, beside the
 * interviewee's profile panel and the agent's state (mode, counts, recent memories, knowledge graph).
 *
 * Test:
 * 1. Enter "Hi, I am Rich." — the agent resolves Rich (the panel title changes) and asks what he is focused on.
 * 2. Enter any answer — two aspiration memories and two proposed goals appear in the panel.
 * 3. Enter any answer — a fact memory about the blocker appears.
 * 4. Enter any answer — both goals become Confirmed and the agent summarizes.
 */
export const Default: Story = {
  decorators,
  args: {
    layout: [[StoryRole.Chat], [StoryRole.Profile], [StoryRole.AgentState, StoryRole.AgentKnowledge]],
  },
};

/** Plays the four-turn interview and asserts on both the space and the profile panel. */
export const TestInterviewScripted: Story = {
  decorators,
  args: {
    layout: [[StoryRole.Chat], [StoryRole.Profile], [StoryRole.AgentState, StoryRole.AgentKnowledge]],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // 1. Introduction: the agent resolves the person before asking about goals.
    await submitPrompt(canvasElement, PROMPTS[0]);
    await canvas.findByText(/What are you focused on right now/, {}, { timeout: 60_000 });

    // 2. Goals: each is remembered as stated and proposed as a goal.
    await submitPrompt(canvasElement, PROMPTS[1]);
    await canvas.findByText(/What is in the way/, {}, { timeout: 60_000 });

    // 3. Obstacles.
    await submitPrompt(canvasElement, PROMPTS[2]);
    await canvas.findByText(/Are both right/, {}, { timeout: 60_000 });

    // 4. Confirmation and profile update.
    await submitPrompt(canvasElement, PROMPTS[3]);
    await canvas.findByText(/I confirmed both goals/, {}, { timeout: 60_000 });

    // 5. The profile panel lists the goals, now confirmed, and the memories.
    const goalsRegion = await canvas.findByRole('region', { name: 'Goals' }, { timeout: 30_000 });
    const goalsSection = within(goalsRegion);
    for (const title of Object.values(GOALS)) {
      await goalsSection.findByText(title);
    }
    await waitFor(
      () => expect(goalsRegion.textContent?.match(/Confirmed/g) ?? [], goalsRegion.textContent ?? '').toHaveLength(2),
      { timeout: 30_000 },
    );
    const memoriesSection = within(await canvas.findByRole('region', { name: 'Memories' }));
    for (const content of Object.values(MEMORIES)) {
      await memoriesSection.findByText(content);
    }

    // 6. The agent state panel counts what the interview recorded and shows the interview mode.
    await waitFor(() => expect(canvas.getByTestId('agent-state-memories').textContent).toBe('3'), { timeout: 30_000 });
    await waitFor(() => expect(canvas.getByTestId('agent-state-goals').textContent).toBe('2'));
    await waitFor(() => expect(canvas.getByTestId('agent-state-people').textContent).toBe('1'));
    within(await canvas.findByRole('region', { name: 'Identity' })).getByText('Interview');

    // 7. The space holds one interviewee, two confirmed goals and three memories.
    await waitForSpace(
      ({ people, goals, memories }) =>
        people.length === 1 &&
        goals.length === 2 &&
        goals.every(({ status }) => status === 'confirmed') &&
        memories >= 3,
    );
  },
};

/**
 * The same agent and layout on a real model: DeepSeek V4 Pro, served through EDGE with the story's
 * identity, so no key reaches the browser. Live AI, so excluded from CI.
 *
 * Steps:
 * 1. Enter "Hi, I am Rich." — the agent states its purpose, resolves you (the panel title becomes your name) and asks one open question.
 * 2. Describe a goal with a deadline (e.g. "Get the interlocutor demo working end to end by the end of October.") — a proposed goal and memories appear in the panel.
 * 3. Answer its follow-ups (why, obstacles, who is involved) — each answer adds memories.
 * 4. When it reads your goals back, confirm them — the goals become Confirmed and the agent summarizes.
 */
export const Live: Story = {
  decorators: createDecorators({
    createAgent: INTERLOCUTOR,
    plugins: [AgentPlugin.make()],
    types: INTERVIEW_TYPES,
    skills: [INTERVIEW_SKILL_KEY],
    // Set before the first turn so the interview runs on the model it is evaluated on.
    onChatCreated: async ({ chat }) => {
      Obj.update(chat, (chat) => {
        chat.session = { ...chat.session, model: Model.deepseekV4Pro.id };
      });
    },
  }),
  args: {
    layout: [[StoryRole.Chat], [StoryRole.Profile], [StoryRole.AgentState, StoryRole.AgentKnowledge]],
  },
  tags: ['!test'],
};
