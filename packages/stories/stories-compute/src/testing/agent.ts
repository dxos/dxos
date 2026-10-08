//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import * as Operation from '@dxos/compute/Operation';
import * as StorageService from '@dxos/compute/StorageService';

export const AGENT_DEMO_PROCESS_KEY = 'org.dxos.stories.compute.agent-demo';

/** Longest prompt the process accepts; the transcript quotes it, so it stays card-sized. */
export const MAX_PROMPT_LENGTH = 500;

/** Prompts the command panel offers, each steering the script to a different set of tools. */
export const SAMPLE_PROMPTS: readonly string[] = [
  'Research the history of the Lisbon tram network',
  'Fix the flaky timeout in the sync engine tests',
  'Analyze last quarter sales by region and chart the trend',
  'Schedule a design review with the platform team next week',
  'Compare the top three vector databases for a small startup',
  'Refactor the billing function to remove duplicated code',
];

export const randomPrompt = (): string => SAMPLE_PROMPTS[Math.floor(Math.random() * SAMPLE_PROMPTS.length)];

/**
 * Starts the agent on a prompt. Only the first prompt is acted on: the agent works through one task
 * and then finishes, as a one-shot background agent would.
 */
export const AgentDemoInput = Schema.Struct({
  prompt: Schema.String.pipe(Schema.check(Schema.isMinLength(1), Schema.isMaxLength(MAX_PROMPT_LENGTH))),
  /** Scales every pause between transcript entries; 1 reads at a human pace. */
  pace: Schema.Number.pipe(Schema.check(Schema.isBetween({ minimum: 0.01, maximum: 10 })), Schema.optional),
});

export type AgentDemoInput = Schema.Schema.Type<typeof AgentDemoInput>;

export const TranscriptKind = Schema.Literals(['prompt', 'thought', 'tool-call', 'tool-result', 'answer']);
export type TranscriptKind = Schema.Schema.Type<typeof TranscriptKind>;

/** One line of the agent's transcript, pushed as it happens. */
export const TranscriptEntry = Schema.Struct({
  /** Position in the transcript, from 0. */
  seq: Schema.Number,
  kind: TranscriptKind,
  text: Schema.String,
  /** Tool a `tool-call` invokes or a `tool-result` answers. */
  tool: Schema.optional(Schema.String),
});

export type TranscriptEntry = Schema.Schema.Type<typeof TranscriptEntry>;

/** A transcript entry and how long the agent appears to spend producing it. */
type ScriptStep = Omit<TranscriptEntry, 'seq'> & { delay: number };

/** Deterministic PRNG, so a revived process regenerates the transcript it was already pushing. */
const mulberry32 = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
};

type Random = () => number;

const pick = <T>(random: Random, values: readonly T[]): T => values[Math.floor(random() * values.length)];

const STOPWORDS = new Set([
  'about',
  'after',
  'from',
  'into',
  'last',
  'next',
  'that',
  'their',
  'them',
  'then',
  'this',
  'with',
  'what',
  'which',
  'week',
  'three',
]);

const LEADING_VERBS =
  /^(please\s+)?(find|research|summarize|fix|write|draft|plan|analyze|analyse|compare|explain|schedule|refactor|investigate|look up|build|create)\s+/i;

/** The prompt without its leading imperative, e.g. "the history of the Lisbon tram network". */
const topicOf = (prompt: string): string =>
  prompt
    .trim()
    .replace(/[.!?]+$/, '')
    .replace(LEADING_VERBS, '');

/** The prompt's most distinctive words, used as search terms. */
const keywordsOf = (prompt: string): string[] => {
  const words = prompt
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 3 && !STOPWORDS.has(word));
  return [...new Set(words)].sort((left, right) => right.length - left.length).slice(0, 3);
};

const slug = (words: string[]): string => words.join('-') || 'task';

type ScriptContext = { topic: string; keywords: string[]; random: Random };

type ToolStep = {
  thought: (context: ScriptContext) => string;
  tool: string;
  args: (context: ScriptContext) => Record<string, unknown>;
  result: (context: ScriptContext) => string;
};

type Scenario = {
  match: RegExp;
  plan: (context: ScriptContext) => string;
  steps: readonly ToolStep[];
  answer: (context: ScriptContext) => string;
};

const RESEARCH: Scenario = {
  match: /./,
  plan: ({ topic }) => `I'll look up ${topic}, read the most relevant sources, then summarize.`,
  steps: [
    {
      thought: () => 'Starting with a broad search.',
      tool: 'search_web',
      args: ({ keywords }) => ({ query: keywords.join(' ') }),
      result: ({ random }) =>
        `${3 + Math.floor(random() * 9)} results; top: encyclopedia entry, archive, recent article`,
    },
    {
      thought: () => 'The archive looks the most detailed; reading it.',
      tool: 'fetch_page',
      args: ({ keywords }) => ({ url: `https://archive.example.org/${slug(keywords)}` }),
      result: ({ random }) => `${(2 + random() * 6).toFixed(1)}k words; 4 sections, 12 dates extracted`,
    },
    {
      thought: () => 'Saving key facts before writing up.',
      tool: 'write_notes',
      args: ({ keywords }) => ({ file: `notes/${slug(keywords)}.md`, sections: 3 }),
      result: () => 'saved',
    },
  ],
  answer: ({ topic }) =>
    `Here's a short summary of ${topic}, with sources and a timeline of key dates in the notes I saved.`,
};

const CODE: Scenario = {
  match: /\b(bug|test|tests|code|refactor|fix|function|flaky|compile|build)\b/i,
  plan: ({ topic }) => `I'll find the code behind ${topic}, reproduce the problem, change it and re-run the tests.`,
  steps: [
    {
      thought: () => 'Locating the relevant code first.',
      tool: 'grep_repo',
      args: ({ keywords }) => ({ pattern: keywords[0] ?? 'TODO' }),
      result: ({ random }) => `${2 + Math.floor(random() * 6)} matches in src/`,
    },
    {
      thought: () => 'Reading the main match.',
      tool: 'read_file',
      args: ({ keywords }) => ({ path: `src/${slug(keywords.slice(0, 2))}.ts` }),
      result: ({ random }) => `${80 + Math.floor(random() * 300)} lines`,
    },
    {
      thought: () => 'Reproducing before changing anything.',
      tool: 'run_tests',
      args: ({ keywords }) => ({ filter: keywords[0] ?? '' }),
      result: ({ random }) => `${1 + Math.floor(random() * 3)} failed, ${20 + Math.floor(random() * 40)} passed`,
    },
    {
      thought: () => 'Found it: the shared state is not reset between runs.',
      tool: 'edit_file',
      args: ({ keywords }) => ({ path: `src/${slug(keywords.slice(0, 2))}.ts`, hunks: 2 }),
      result: () => '+14 −22',
    },
    {
      thought: () => 'Verifying the fix.',
      tool: 'run_tests',
      args: ({ keywords }) => ({ filter: keywords[0] ?? '' }),
      result: ({ random }) => `0 failed, ${30 + Math.floor(random() * 40)} passed`,
    },
  ],
  answer: () => 'Done: the tests pass and the change is ready for review.',
};

const DATA: Scenario = {
  match: /\b(sales|data|chart|report|revenue|metrics|numbers|quarter|analy[sz]e)\b/i,
  plan: ({ topic }) => `I'll pull the numbers for ${topic}, crunch them, and chart the result.`,
  steps: [
    {
      thought: () => 'Querying the warehouse.',
      tool: 'query_database',
      args: ({ keywords }) => ({ sql: `SELECT region, SUM(amount) FROM ${keywords[0] ?? 'facts'} GROUP BY region` }),
      result: ({ random }) => `${4 + Math.floor(random() * 5)} rows`,
    },
    {
      thought: () => 'Computing growth per region.',
      tool: 'run_python',
      args: () => ({ code: 'df.pct_change().round(3)' }),
      result: ({ random }) => `EMEA +${(random() * 20).toFixed(1)}%, APAC +${(random() * 30).toFixed(1)}%`,
    },
    {
      thought: () => 'A line chart shows the trend best.',
      tool: 'create_chart',
      args: () => ({ type: 'line', x: 'month', y: 'amount' }),
      result: () => 'chart.svg created',
    },
  ],
  answer: () => 'Growth is strongest in APAC; the chart is attached.',
};

const SCHEDULE: Scenario = {
  match: /\b(schedule|meeting|calendar|email|invite|review|call)\b/i,
  plan: ({ topic }) => `I'll check calendars, find a slot that works, and send invites for ${topic}.`,
  steps: [
    {
      thought: () => 'Finding who should attend.',
      tool: 'find_contacts',
      args: ({ keywords }) => ({ team: keywords[0] ?? 'team' }),
      result: ({ random }) => `${3 + Math.floor(random() * 5)} people`,
    },
    {
      thought: () => 'Checking availability.',
      tool: 'list_calendar',
      args: () => ({ range: 'next week' }),
      result: ({ random }) =>
        `${1 + Math.floor(random() * 3)} free slots; best: ${pick(random, ['Tue', 'Wed', 'Thu'])} 14:00`,
    },
    {
      thought: () => 'Drafting the invitation.',
      tool: 'draft_email',
      args: ({ keywords }) => ({ subject: keywords.join(' '), attendees: 'team' }),
      result: () => 'draft saved',
    },
  ],
  answer: ({ topic }) => `I've drafted invites for ${topic}; send them when you're ready.`,
};

/** Most specific first; {@link RESEARCH} matches anything. */
const SCENARIOS: readonly Scenario[] = [CODE, DATA, SCHEDULE, RESEARCH];

/** Base pause, in ms, before an entry of each kind appears. */
const DELAYS: Record<TranscriptKind, number> = {
  'prompt': 0,
  'thought': 1_200,
  'tool-call': 700,
  'tool-result': 1_500,
  'answer': 1_500,
};

/**
 * The transcript an agent produces for `prompt`: a plan, a tool call and result per step (the
 * scenario chosen by the prompt's words), and an answer. Deterministic in `prompt` and `seed`.
 */
export const makeScript = (prompt: string, seed: number, pace = 1): ScriptStep[] => {
  const random = mulberry32(seed);
  const context: ScriptContext = { topic: topicOf(prompt), keywords: keywordsOf(prompt), random };
  const scenario = SCENARIOS.find(({ match }) => match.test(prompt)) ?? RESEARCH;
  const step = (entry: Omit<ScriptStep, 'delay'>): ScriptStep => ({
    ...entry,
    delay: Math.round(DELAYS[entry.kind] * pace * (0.7 + random() * 0.6)),
  });

  return [
    step({ kind: 'prompt', text: prompt }),
    step({ kind: 'thought', text: scenario.plan(context) }),
    ...scenario.steps.flatMap(({ thought, tool, args, result }) => [
      step({ kind: 'thought', text: thought(context) }),
      step({ kind: 'tool-call', tool, text: JSON.stringify(args(context)) }),
      step({ kind: 'tool-result', tool, text: result(context) }),
    ]),
    step({ kind: 'answer', text: scenario.answer(context) }),
  ];
};

/** Everything the process keeps between handlers; persisted so a revived host resumes the transcript. */
const AgentDemoState = Schema.Struct({
  prompt: Schema.String,
  seed: Schema.Number,
  pace: Schema.Number,
  /** Next entry to push. */
  position: Schema.Number,
});

type AgentDemoState = Schema.Schema.Type<typeof AgentDemoState>;

const StateCell = StorageService.cell(Schema.fromJsonString(AgentDemoState), 'agent-demo/state');

/**
 * A scripted stand-in for an agent: given a prompt, it pushes a transcript of thoughts, tool calls and
 * tool results one entry at a time, as a real agent's trace would appear, then answers and finishes. No
 * model is involved, so it runs anywhere (locally or on EDGE) without credentials.
 *
 * Its state lives in the process's storage rather than in the closure, so a host that revives it (an
 * EDGE Durable Object after eviction) continues the transcript instead of going silent.
 */
export const AgentDemoProcess = Operation.makeDurable({
  key: AGENT_DEMO_PROCESS_KEY,
  input: AgentDemoInput,
  output: TranscriptEntry,
  services: [],
}).pipe(
  Operation.withDurableHandler((ctx) =>
    Effect.gen(function* () {
      let state = yield* StateCell.get;
      const save = (next: AgentDemoState) =>
        Effect.suspend(() => {
          state = Option.some(next);
          return StateCell.set(next);
        });

      return {
        onInput: Effect.fnUntraced(function* (input: AgentDemoInput) {
          if (Option.isSome(state)) {
            return;
          }
          yield* save({
            prompt: input.prompt,
            seed: Math.floor(Math.random() * 2 ** 32),
            pace: input.pace ?? 1,
            position: 0,
          });
          yield* ctx.setAlarm(0);
        }),
        onAlarm: Effect.fnUntraced(function* () {
          if (Option.isNone(state)) {
            return;
          }
          const current = state.value;
          const script = makeScript(current.prompt, current.seed, current.pace);
          const step = script[current.position];
          if (!step) {
            ctx.succeed();
            return;
          }
          const { delay: _delay, ...entry } = step;
          const position = current.position + 1;
          yield* save({ ...current, position });
          ctx.submitOutput({ seq: current.position, ...entry });
          const next = script[position];
          if (!next) {
            ctx.succeed();
            return;
          }
          yield* ctx.setAlarm(next.delay);
        }),
      };
    }),
  ),
);
