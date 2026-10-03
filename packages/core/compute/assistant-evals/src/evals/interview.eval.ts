//
// Copyright 2026 DXOS.org
//

import * as LanguageModel from 'effect/ai/LanguageModel';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';
import { evalite } from 'evalite';

import { AiService, Model } from '@dxos/ai';
import { AiServiceTestingPreset } from '@dxos/ai/testing';
import { Database, Filter, Obj, Query, Ref, Relation } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import * as AgentPlugin from '@dxos/plugin-agent/AgentPlugin';
import * as Goal from '@dxos/plugin-agent/Goal';
import * as InterviewSkill from '@dxos/plugin-agent/InterviewSkill';
import * as Memory from '@dxos/plugin-agent/Memory';
import * as Profile from '@dxos/plugin-agent/Profile';
import * as ProfileOf from '@dxos/plugin-crm/ProfileOf';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import * as MarkdownPlugin from '@dxos/plugin-markdown/MarkdownPlugin';
import { HasSubject, Organization, Person } from '@dxos/types';
import { trim } from '@dxos/util';

import { createEvalRunner } from '../runner.ts';
import * as Scorer from '../Scorer.ts';

//
// The interview skill (plugin-agent) run live: DeepSeek V4 Pro interviews a persona played by
// DeepSeek V4 Flash, and the graph it leaves (Person, Goal, Memory, profile document) is graded
// against the persona's ground truth. Flash also judges the interviewing craft.
//
// Needs `DEEPSEEK_API_KEY`, which routes DeepSeek directly (see `runner.ts`); without it the eval is
// skipped. `pnpm evals:live src/evals/interview.eval.ts` resolves it from 1Password (`op run`).
//

const DEEPSEEK_KEY = Boolean(process.env.DEEPSEEK_API_KEY);

/** Upper bound on the persona's messages, the opening included. */
const MAX_TURNS = 10;

/** Fewer persona messages than this and nothing was really asked. */
const MIN_TURNS = 3;

/** A memory longer than this is a transcript excerpt rather than one claim. */
const MAX_MEMORY_LENGTH = 200;

type GoalTruth = {
  /** Every pattern must match the captured goal's title or description. */
  match: RegExp[];
  horizons: Goal.Horizon[];
  /** The goal belongs to the persona's team rather than (only) to the persona. */
  shared?: boolean;
};

type FactTruth = {
  /** Every pattern must match one memory's content. */
  match: RegExp[];
};

type Persona = {
  id: string;
  fullName: string;
  /** What the persona calls itself, matched against the Person the agent resolves. */
  names: RegExp;
  discordId: string;
  opening: string;
  style: string;
  /** Everything the simulated user may say, as prose. */
  background: string;
  goals: GoalTruth[];
  facts: FactTruth[];
};

const PERSONAS: Persona[] = [
  {
    id: 'rich',
    fullName: 'Rich Burdon',
    names: /\brich\b/i,
    discordId: '102938475610293847',
    opening: 'Hi, I am Rich.',
    style: 'a founder: direct, energetic, answers in two or three sentences',
    background: trim`
      You are Rich Burdon, founder and CEO of DXOS, which builds Composer, a local-first collaborative workspace.
      You lead the DXOS team of about twelve people.
      Goal 1: get the interlocutor demo (an AI agent that converses in Discord and remembers people) working end to end by the end of October.
      It matters because it is the centerpiece of an investor update.
      What is in the way: the Discord bot running on EDGE (the DXOS cloud) is not reliable yet; Dima is working on it.
      Goal 2: hire two engineers this quarter, to grow the platform team; you are interviewing candidates now.
      You prefer short written updates over meetings.
    `,
    goals: [
      { match: [/demo|interlocutor/i], horizons: ['now', 'quarter'] },
      { match: [/hir(e|ing)|recruit/i, /engineer/i], horizons: ['now', 'quarter'] },
    ],
    facts: [{ match: [/founder|ceo/i] }, { match: [/discord/i, /bot|edge/i] }, { match: [/dxos/i] }],
  },
  {
    id: 'sam',
    fullName: 'Sam Chen',
    names: /\bsam\b/i,
    discordId: '564738291056473829',
    opening: 'hey',
    style: 'a terse engineer: lowercase, a few words per reply, never elaborates unless asked directly',
    background: trim`
      You are Sam Chen, a backend engineer on the Platform team at Acme Robotics.
      Goal 1: cut p95 sync latency below 200 ms this quarter; customers complain about lag.
      What is in the way: flaky integration tests slow every change down.
      Goal 2: ship the search indexer rewrite by the end of the year.
      You prefer async written updates; you dislike meetings.
    `,
    goals: [
      { match: [/latency|p95|sync/i], horizons: ['now', 'quarter'] },
      { match: [/index/i], horizons: ['quarter', 'year'] },
    ],
    facts: [{ match: [/platform|backend/i] }, { match: [/flaky|test/i] }, { match: [/async|written|meeting/i] }],
  },
  {
    id: 'priya',
    fullName: 'Priya Nair',
    names: /\bpriya\b/i,
    discordId: '918273645591827364',
    opening: 'Hello! Priya here, happy to chat :)',
    style: 'a chatty product manager: warm, talkative, tangents and anecdotes, four or five sentences per reply',
    background: trim`
      You are Priya Nair, product manager of the Composer team at DXOS. You report to Rich.
      Shared team goal (the whole Composer team owns it): launch the Composer public beta in Q4.
      It matters because early adopters are waiting and the team wants feedback before 1.0.
      What is in the way: onboarding is confusing, and sync bugs keep slipping the schedule.
      Personal goal: run ten customer interviews this month to shape the beta.
      The Composer team is six people. You love short Loom videos for updates.
    `,
    goals: [
      { match: [/beta|launch/i], horizons: ['now', 'quarter'], shared: true },
      { match: [/interview/i], horizons: ['now', 'quarter'] },
    ],
    facts: [{ match: [/product manager|\bpm\b/i] }, { match: [/onboarding|sync/i] }, { match: [/loom|video/i] }],
  },
];

//
// Simulated user and judge: DeepSeek V4 Flash, called directly.
//

const flash = Layer.provideMerge(
  AiService.languageModel('com.deepseek.model.deepseek-v4-flash.default', { thinking: false }),
  AiServiceTestingPreset('deepseek'),
);

const render = (transcript: readonly Scorer.Turn[]): string =>
  transcript.map(({ role, text }) => `${role === 'user' ? 'Person' : 'Interviewer'}: ${text}`).join('\n\n');

const UserTurn = Schema.Struct({
  reply: Schema.String.annotate({ description: 'Your next message; empty when done.' }),
  done: Schema.Boolean.annotate({ description: 'True once the interviewer has wrapped up and asked nothing more.' }),
});

const simulateUser = (persona: Persona, transcript: readonly Scorer.Turn[]) =>
  LanguageModel.generateObject({
    prompt: trim`
      You are role-playing a person being interviewed by an AI assistant that wants to learn about your work and goals.
      Stay in character as ${persona.fullName}, ${persona.style}.

      Rules:
      - Answer only from the persona below; if asked about something it does not cover, say you have nothing to add.
      - Answer only what was asked; do not volunteer the whole persona at once.
      - When the interviewer reads your goals back, confirm the ones that match the persona, correct any that are wrong, and say "that's all" if nothing is missing.
      - Set done to true, with an empty reply, only when the interviewer's last message wraps up without asking anything.

      <persona>
      ${persona.background}
      </persona>

      <transcript>
      ${render(transcript)}
      </transcript>

      Respond in JSON with the fields "reply" and "done".
    `,
    schema: UserTurn,
  }).pipe(
    Effect.provide(flash),
    Effect.map(({ value }) => (value.done ? undefined : value.reply)),
  );

const CraftVerdict = Schema.Struct({
  probing: Schema.Number.annotate({
    description: 'Depth of probing each goal (why, by when, obstacles, who), 0 to 1.',
  }),
  reflecting: Schema.Number.annotate({ description: 'How well it reflected back what it heard, 0 to 1.' }),
  tone: Schema.Number.annotate({ description: 'Warm, concise, one question at a time, 0 to 1.' }),
  rationale: Schema.String.annotate({ description: 'One or two sentences explaining the scores.' }),
});

type CraftVerdict = Schema.Schema.Type<typeof CraftVerdict>;

const CRAFT_RUBRIC = trim`
  You are grading the interviewer in a transcript of an AI assistant interviewing a person about their work and goals.
  Score each dimension from 0 (absent) to 1 (excellent):
  - probing: for each goal, did it ask why it matters, by when, what is in the way, and who is involved?
  - reflecting: did it reflect back what it heard in its own words so the person could correct it?
  - tone: was it warm and concise, asking one question at a time, without lecturing or repeating itself?
  Be strict: a transcript that fires several questions at once, never paraphrases, or ignores the goals scores low.
  Respond in JSON with the fields "probing", "reflecting", "tone" and "rationale".
`;

const judgeCraft = (transcript: readonly Scorer.Turn[]): Effect.Effect<CraftVerdict, unknown> =>
  LanguageModel.generateObject({
    prompt: `${CRAFT_RUBRIC}\n\n<transcript>\n${render(transcript)}\n</transcript>`,
    schema: CraftVerdict,
  }).pipe(
    Effect.provide(flash),
    Effect.map(({ value }) => value),
    Effect.tap((verdict) => Effect.logInfo('interview craft', verdict)),
  );

//
// Graph reads.
//

const matchesAll = (patterns: RegExp[], text: string) => patterns.every((pattern) => pattern.test(text));

const goalText = (goal: Goal.Goal) => `${goal.title} ${goal.description ?? ''}`;

const transcript = Effect.gen(function* () {
  return (yield* Scorer.Run).transcript;
});

const liveGoals = Scorer.shared(
  Database.query(Filter.type(Goal.Goal)).run.pipe(
    Effect.map((goals) => goals.filter((goal) => goal.status !== 'dropped')),
  ),
);

const memories = Scorer.shared(
  Database.query(Filter.type(Memory.Memory)).run.pipe(
    Effect.map((memories) => memories.filter((memory) => memory.status === 'active')),
  ),
);

const people = Scorer.shared(Database.query(Filter.type(Person.Person)).run);

/** The Person the persona resolved to, when there is exactly one. */
const interviewee = (persona: Persona) =>
  people.pipe(
    Effect.map((people) => {
      const matches = people.filter(
        (person) =>
          (person.identities ?? []).some((identity) => identity.value === persona.discordId) ||
          persona.names.test(`${person.fullName ?? ''} ${person.preferredName ?? ''}`),
      );
      return matches.length === 1 ? matches[0] : undefined;
    }),
  );

const craftVerdict = Scorer.shared(transcript.pipe(Effect.flatMap(judgeCraft)));

const fraction = (hits: number, total: number) => (total === 0 ? 0 : hits / total);

const scorersFor = (persona: Persona): Scorer.Any[] => [
  Scorer.make({
    name: 'goal-recall',
    description: 'Fraction of the persona’s goals captured as a live Goal.',
    score: liveGoals.pipe(
      Effect.map((goals) =>
        fraction(
          persona.goals.filter((truth) => goals.some((goal) => matchesAll(truth.match, goalText(goal)))).length,
          persona.goals.length,
        ),
      ),
    ),
  }),
  Scorer.make({
    name: 'goal-precision',
    description: 'Fraction of live Goals that match one of the persona’s goals.',
    score: liveGoals.pipe(
      Effect.map((goals) =>
        fraction(
          goals.filter((goal) => persona.goals.some((truth) => matchesAll(truth.match, goalText(goal)))).length,
          goals.length,
        ),
      ),
    ),
  }),
  Scorer.make({
    name: 'goal-horizons',
    description: 'Fraction of matched goals whose horizon is one the ground truth allows.',
    score: liveGoals.pipe(
      Effect.map((goals) => {
        const matched = persona.goals.flatMap((truth) =>
          goals.filter((goal) => matchesAll(truth.match, goalText(goal))).map((goal) => ({ truth, goal })),
        );
        return fraction(
          matched.filter(({ truth, goal }) => truth.horizons.includes(goal.horizon)).length,
          matched.length,
        );
      }),
    ),
  }),
  Scorer.make({
    name: 'goals-confirmed',
    description: 'At least one goal was captured and every live goal was confirmed by its owner.',
    score: liveGoals.pipe(
      Effect.map(
        (goals) => goals.length > 0 && goals.every((goal) => goal.status === 'confirmed' || goal.status === 'active'),
      ),
    ),
  }),
  ...(persona.goals.some((truth) => truth.shared)
    ? [
        Scorer.make({
          name: 'shared-goal-team-owned',
          description: 'Each shared goal is owned by an Organization (the team), not only the person.',
          score: Effect.gen(function* () {
            const goals = yield* liveGoals;
            const shared = persona.goals.filter((truth) => truth.shared);
            const owned = yield* Effect.forEach(shared, (truth) =>
              Effect.gen(function* () {
                const goal = goals.find((goal) => matchesAll(truth.match, goalText(goal)));
                if (!goal) {
                  return false;
                }
                const owners = yield* Effect.forEach(goal.owners, (owner) => Database.load(owner));
                return owners.some((owner) => Obj.instanceOf(Organization.Organization, owner));
              }),
            );
            return fraction(owned.filter(Boolean).length, shared.length);
          }),
        }),
      ]
    : []),
  Scorer.make({
    name: 'fact-recall',
    description: 'Fraction of the persona’s stated facts recorded as at least one active Memory.',
    score: memories.pipe(
      Effect.map((memories) =>
        fraction(
          persona.facts.filter((truth) => memories.some((memory) => matchesAll(truth.match, memory.content))).length,
          persona.facts.length,
        ),
      ),
    ),
  }),
  Scorer.make({
    name: 'memory-provenance',
    description: 'Fraction of active memories that cite their source message or chat.',
    score: memories.pipe(
      Effect.map((memories) =>
        fraction(memories.filter((memory) => memory.source !== undefined).length, memories.length),
      ),
    ),
  }),
  Scorer.make({
    name: 'memories-atomic',
    description: `Fraction of active memories that are one sentence of at most ${MAX_MEMORY_LENGTH} characters.`,
    score: memories.pipe(
      Effect.map((memories) =>
        fraction(
          memories.filter(
            ({ content }) =>
              content.length <= MAX_MEMORY_LENGTH &&
              content
                .trim()
                .split(/[.!?](?:\s|$)/)
                .filter(Boolean).length <= 1,
          ).length,
          memories.length,
        ),
      ),
    ),
  }),
  Scorer.make({
    name: 'one-question-per-turn',
    description: 'Fraction of interviewer turns asking at most one question.',
    score: transcript.pipe(
      Effect.map((turns) => {
        const replies = turns.filter(({ role }) => role === 'assistant');
        return fraction(replies.filter(({ text }) => (text.match(/\?/g) ?? []).length <= 1).length, replies.length);
      }),
    ),
  }),
  Scorer.make({
    name: 'turns-within-bounds',
    description: `The interviewer wrapped up (its last message asks nothing) within ${MIN_TURNS} to ${MAX_TURNS} persona messages.`,
    score: transcript.pipe(
      Effect.map((turns) => {
        const count = turns.filter(({ role }) => role === 'user').length;
        const last = turns.findLast(({ role }) => role === 'assistant');
        return count >= MIN_TURNS && count <= MAX_TURNS && last !== undefined && !last.text.includes('?');
      }),
    ),
  }),
  Scorer.make({
    name: 'single-person-by-handle',
    description: 'Exactly one Person stands for the persona, and it carries the persona’s Discord handle.',
    score: interviewee(persona).pipe(
      Effect.map(
        (person) =>
          person !== undefined &&
          (person.identities ?? []).some(
            (identity) => identity.value === persona.discordId && identity.label === 'discord',
          ),
      ),
    ),
  }),
  Scorer.make({
    name: 'profile-mentions-goals',
    description: 'The persona’s profile document exists and names every confirmed goal.',
    score: Effect.gen(function* () {
      const person = yield* interviewee(persona);
      if (!person) {
        return false;
      }
      const [relation] = yield* Database.query(Query.select(Filter.id(person.id)).targetOf(ProfileOf.ProfileOf)).run;
      const document = relation ? Relation.getSource(relation) : undefined;
      if (!document || !Obj.instanceOf(Markdown.Document, document)) {
        return false;
      }
      const text = yield* Database.load(document.content);
      const confirmed = (yield* liveGoals).filter(
        (goal) =>
          (goal.status === 'confirmed' || goal.status === 'active') &&
          goal.owners.some((owner) => Profile.refersTo(owner, person.id)),
      );
      return confirmed.length > 0 && confirmed.every((goal) => text.content.includes(goal.title));
    }),
  }),
  Scorer.make({
    name: 'judge-probing',
    description: 'LLM judge (Flash): depth of probing each goal.',
    score: craftVerdict.pipe(Effect.map(({ probing }) => probing)),
  }),
  Scorer.make({
    name: 'judge-reflecting',
    description: 'LLM judge (Flash): reflecting back what was heard.',
    score: craftVerdict.pipe(Effect.map(({ reflecting }) => reflecting)),
  }),
  Scorer.make({
    name: 'judge-tone',
    description: 'LLM judge (Flash): warm, concise, one question at a time.',
    score: craftVerdict.pipe(Effect.map(({ tone }) => tone)),
  }),
];

const Input = Schema.Struct({
  persona: Schema.String,
  displayName: Schema.String,
  discordId: Schema.String,
});

type Input = Schema.Schema.Type<typeof Input>;

const personaOf = (input: Input): Persona => {
  const persona = PERSONAS.find(({ id }) => id === input.persona);
  if (!persona) {
    throw new Error(`Unknown persona: ${input.persona}`);
  }
  return persona;
};

const task = createEvalRunner({
  model: Model.deepseekV4Pro.id,
  instructions: trim`
    You are an interlocutor agent talking with a person in a Discord thread.
    Interview them using the Interview skill.
    Their Discord user id is {{discordId}} (handle label "discord") and their display name is {{displayName}}.
  `,
  input: Input,
  output: Schema.Unknown,
  skills: () => [Ref.make(InterviewSkill.make())],
  plugins: [MarkdownPlugin.make(), AgentPlugin.make()],
  types: [Memory.Memory, Goal.Goal, HasSubject.HasSubject, Markdown.Document, ProfileOf.ProfileOf],
  conversation: {
    opening: (input) => personaOf(input).opening,
    reply: ({ input, transcript }) => simulateUser(personaOf(input), transcript),
    maxTurns: MAX_TURNS,
  },
  // Up to ten tool-heavy turns on a thinking model.
  timeout: 20 * 60 * 1_000,
  gradeIncomplete: true,
  scored: true,
});

const run = DEEPSEEK_KEY ? evalite : evalite.skip;

for (const persona of PERSONAS) {
  run(`Interview — ${persona.id}: goals, memories and profile from a simulated interview`, {
    data: [
      { input: { persona: persona.id, displayName: persona.fullName.split(' ')[0], discordId: persona.discordId } },
    ],
    task,
    scorers: Scorer.toEvalite(scorersFor(persona)),
  });
}

// A judge that only ever passes would be worthless: a curt, multi-question, never-reflecting
// interviewer must score low on the same rubric.
const BAD_TRANSCRIPT: Scorer.Turn[] = [
  { role: 'user', text: 'Hi, I am Rich.' },
  {
    role: 'assistant',
    text: 'What is your role? What are your goals? Who is on your team? How do you like to work? When are your deadlines?',
  },
  { role: 'user', text: 'I run DXOS. I want the demo done by October and to hire two engineers.' },
  { role: 'assistant', text: 'Ok. Anything else? What else? Done?' },
];

run('Interview — craft judge fails a curt, multi-question interviewer', {
  data: [{ input: BAD_TRANSCRIPT }],
  task: (input: Scorer.Turn[]) => EffectEx.runPromise(judgeCraft(input)),
  scorers: [
    {
      name: 'judge-correctly-fails',
      description: 'The mean craft score of a bad transcript is below one half.',
      scorer: ({ output }) => ((output.probing + output.reflecting + output.tone) / 3 < 0.5 ? 1 : 0),
    },
  ],
});
