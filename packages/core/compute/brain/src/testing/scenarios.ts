//
// Copyright 2026 DXOS.org
//

/** A scripted fact; `concerns` stubs entity resolution and defaults to the subject. */
export type ScenarioFact = {
  readonly id: string;
  /** Handle of who said it, or `agent` for the agent's own actions. */
  readonly speaker: string;
  /** The words as said. */
  readonly quote: string;
  /** Subject entity handle. */
  readonly s: string;
  /** Predicate, before vocabulary canonicalization. */
  readonly p: string;
  /** Object entity handle or literal. */
  readonly o: string;
  /** Speech-act force of the utterance. */
  readonly force: 'assertive' | 'directive' | 'commissive' | 'expressive';
  /** `+` affirmed, `-` negated or refused, `?` open question or unknown. */
  readonly polarity: '+' | '-' | '?';
  readonly mood: 'declarative' | 'interrogative' | 'imperative';
  /** Conversation or message the fact came from, e.g. `chat:general`. */
  readonly source: string;
  /** FactBank factuality: certainty (CT/PR/PS/U) and polarity (+/-/u). */
  readonly factuality: 'CT+' | 'CT-' | 'PR+' | 'PR-' | 'PS+' | 'PS-' | 'CTu' | 'Uu';
  /** Entity handles the fact is about; defaults to the subject. */
  readonly concerns?: ReadonlyArray<string>;
};

export type ScenarioAction = {
  readonly id: string;
  /** Action name, e.g. `send_email`. */
  readonly kind: string;
  /** Named action arguments, e.g. `{ to: 'dima' }`. */
  readonly args: Readonly<Record<string, string>>;
};

/** Expected effects of a step; `null` or absent means either outcome is acceptable. */
export type Expectation = {
  readonly wake?: boolean | null;
  readonly achieved?: boolean | null;
  readonly holds?: boolean | null;
  readonly blocks?: boolean | null;
};

export type Step = {
  readonly id: string;
  /** Simulated clock time (ISO) the step runs at. */
  readonly at: string;
  /** Human-readable description of what happens in the step. */
  readonly note: string;
  readonly facts?: ReadonlyArray<ScenarioFact>;
  readonly actions?: ReadonlyArray<ScenarioAction>;
  /** Subgoal ids that become `active` from this step on. */
  readonly subgoals?: ReadonlyArray<string>;
  /** Subgoal status overrides by subgoal id, e.g. `{ g_w2: 'achieved' }`. */
  readonly status?: Readonly<Record<string, string>>;
  readonly expect: Expectation;
};

/** A timeline for one of the BRAIN.md example goals. */
export type Scenario = {
  /** Number of the example goal in BRAIN.md. */
  readonly n: number;
  /** Natural-language goal text. */
  readonly goal: string;
  /** Handle of the actor who owns the goal. */
  readonly owner: string;
  /** Source id of the conversation a session goal is scoped to. */
  readonly session?: string;
  readonly createdAt: string;
  /** Owner-written guidance passed to the compiler as the goal's instructions. */
  readonly context?: string;
  readonly steps: ReadonlyArray<Step>;
  /** At least one step of each group must wake (a time-driven wake with a tolerant schedule). */
  readonly wakeOneOf?: ReadonlyArray<ReadonlyArray<string>>;
};

const at = (time: string) => `2027-${time}:00Z`;

const fact = (
  id: string,
  speaker: string,
  quote: string,
  s: string,
  p: string,
  o: string,
  extra: Partial<ScenarioFact> = {},
): ScenarioFact => ({
  id,
  speaker,
  quote,
  s,
  p,
  o,
  force: 'assertive',
  polarity: '+',
  mood: 'declarative',
  source: 'chat:general',
  factuality: 'CT+',
  ...extra,
});

/** A record of the agent's own action, in the goal's feed. */
const agent = (id: string, p: string, o: string): ScenarioFact =>
  fact(id, 'agent', `(agent action) ${p} ${o}`, 'goal', p, o, { source: 'goal' });

/** The eight BRAIN.md example goals, each a hand-written timeline with near misses. */
export const SCENARIOS: ReadonlyArray<Scenario> = [
  {
    n: 1,
    goal: 'Keep me informed about what Dima is working on',
    owner: 'rich',
    createdAt: at('01-04T09:00'),
    steps: [
      {
        id: 's1',
        at: at('01-04T09:10'),
        note: 'Dima states current work',
        facts: [
          fact(
            'f1',
            'dima',
            "I'm working on the sync engine refactor today",
            'dima',
            'working-on',
            'sync engine refactor',
          ),
        ],
        expect: { wake: true, achieved: false },
      },
      {
        id: 's2',
        at: at('01-04T09:20'),
        note: 'unrelated: Alice proposes lunch',
        facts: [
          fact('f2', 'alice', 'Lunch at noon?', 'alice', 'proposes', 'lunch', {
            force: 'directive',
            mood: 'interrogative',
            polarity: '?',
          }),
        ],
        expect: { wake: false, achieved: false },
      },
      {
        id: 's3',
        at: at('01-04T10:00'),
        note: 'near miss: Bob (not Dima) working on something',
        facts: [fact('f3', 'bob', "I'm working on the docs site", 'bob', 'working-on', 'docs site')],
        expect: { wake: false, achieved: false },
      },
      {
        id: 's4',
        at: at('01-04T11:00'),
        note: "third party reports on Dima's work",
        facts: [fact('f4', 'alice', 'Dima finished the auth migration', 'dima', 'completed', 'auth migration')],
        expect: { wake: true, achieved: false },
      },
      {
        id: 's5',
        at: at('01-04T12:00'),
        note: 'Dima small talk (noise; either is fine)',
        facts: [fact('f5', 'dima', 'thanks!', 'dima', 'thanks', 'alice', { force: 'expressive' })],
        expect: { wake: null, achieved: false },
      },
      {
        id: 's6',
        at: at('01-04T13:00'),
        note: 'Dima commits to next work item',
        facts: [
          fact('f6', 'dima', "Next up I'll pick up the indexer bug", 'dima', 'will-work-on', 'indexer bug', {
            force: 'commissive',
          }),
        ],
        expect: { wake: true, achieved: false },
      },
    ],
  },
  {
    n: 2,
    goal: 'Let me know when the release ships',
    owner: 'rich',
    createdAt: at('01-04T09:00'),
    steps: [
      {
        id: 's1',
        at: at('01-04T10:00'),
        note: 'future plan, not shipped',
        facts: [
          fact('f1', 'dima', 'The release should ship Friday', 'release', 'ships-on', 'friday', {
            force: 'commissive',
            factuality: 'PR+',
          }),
        ],
        expect: { achieved: false },
      },
      {
        id: 's2',
        at: at('01-05T10:00'),
        note: 'negative polarity',
        facts: [
          fact('f2', 'dima', "The release didn't ship today, CI is red", 'release', 'shipped', 'today', {
            polarity: '-',
          }),
        ],
        expect: { achieved: false },
      },
      {
        id: 's3',
        at: at('01-05T11:00'),
        note: 'question',
        facts: [
          fact('f3', 'alice', 'Has the release shipped yet?', 'release', 'shipped', 'unknown', {
            mood: 'interrogative',
            polarity: '?',
            force: 'directive',
            factuality: 'Uu',
          }),
        ],
        expect: { achieved: false },
      },
      {
        id: 's4',
        at: at('01-06T09:00'),
        note: 'near miss: something else shipped',
        facts: [fact('f4', 'bob', 'I shipped the docs update', 'bob', 'shipped', 'docs update')],
        expect: { wake: false, achieved: false },
      },
      {
        id: 's5',
        at: at('01-07T16:00'),
        note: 'release shipped',
        facts: [fact('f5', 'dima', 'The v0.9 release shipped to npm', 'release v0.9', 'shipped', 'npm')],
        expect: { wake: true, achieved: null },
      },
      {
        id: 's6',
        at: at('01-07T16:05'),
        note: 'agent notified owner',
        facts: [agent('g1', 'notified', 'rich')],
        expect: { achieved: true },
      },
    ],
  },
  {
    n: 3,
    goal: 'Get Dima to help me with the agent plugin',
    owner: 'rich',
    createdAt: at('01-04T09:00'),
    context: 'Follow up after 2 days without a commitment.',
    steps: [
      {
        id: 's1',
        at: at('01-04T09:01'),
        note: 'agent relays request',
        facts: [agent('g1', 'relayed', 'msg-1'), agent('g2', 'awaiting', 'dima')],
        expect: { achieved: false },
      },
      {
        id: 's2',
        at: at('01-05T10:00'),
        note: 'Dima refuses',
        facts: [
          fact(
            'f1',
            'dima',
            "I'm busy with the release this week, can't help with the agent plugin",
            'dima',
            'helps-with',
            'agent plugin',
            { force: 'commissive', polarity: '-' },
          ),
        ],
        expect: { wake: true, achieved: false },
      },
      {
        id: 's3',
        at: at('01-05T11:00'),
        note: 'near miss: Dima commits to something else',
        facts: [
          fact('f2', 'dima', "I'll review the docs PR tomorrow", 'dima', 'reviews', 'docs PR', { force: 'commissive' }),
        ],
        expect: { wake: false, achieved: false },
      },
      {
        id: 's4',
        at: at('01-05T12:00'),
        note: 'near miss: Alice (not Dima) offers help',
        facts: [
          fact('f3', 'alice', "I'll help with the agent plugin", 'alice', 'helps-with', 'agent plugin', {
            force: 'commissive',
          }),
        ],
        expect: { achieved: false },
      },
      { id: 's5', at: at('01-06T08:00'), note: 'tick: under 2 days', expect: { wake: false, achieved: false } },
      { id: 's6', at: at('01-06T09:30'), note: 'tick: 2 days after creation', expect: { achieved: false } },
      { id: 's7', at: at('01-07T10:30'), note: 'tick: 2 days after refusal', expect: { achieved: false } },
      {
        id: 's8',
        at: at('01-07T11:00'),
        note: 'Dima commits',
        facts: [
          fact('f4', 'dima', "OK, I'll start on the agent plugin", 'dima', 'helps-with', 'agent plugin', {
            force: 'commissive',
          }),
        ],
        expect: { wake: true, achieved: true },
      },
      {
        id: 's9',
        at: at('01-09T12:00'),
        note: 'tick after achieved: no follow-up',
        expect: { wake: false, achieved: true },
      },
    ],
    wakeOneOf: [['s6', 's7']],
  },
  {
    n: 4,
    goal: 'Keep my inbox empty',
    owner: 'rich',
    createdAt: at('01-04T09:00'),
    steps: [
      { id: 's0', at: at('01-04T09:00'), note: 'empty inbox', expect: { wake: false, holds: true, achieved: false } },
      {
        id: 's1',
        at: at('01-04T09:30'),
        note: 'email arrives',
        facts: [
          fact('f1', 'carol@example.com', 'Subject: Invoice for December', 'email:m1', 'received', 'inbox', {
            source: 'mailbox:rich',
          }),
        ],
        expect: { wake: true, holds: false, achieved: false },
      },
      {
        id: 's2',
        at: at('01-04T09:40'),
        note: 'second email',
        facts: [
          fact('f2', 'news@example.com', 'Subject: Weekly newsletter', 'email:m2', 'received', 'inbox', {
            source: 'mailbox:rich',
          }),
        ],
        expect: { wake: true, holds: false },
      },
      {
        id: 's3',
        at: at('01-04T09:45'),
        note: 'agent archives m1',
        facts: [
          fact('f3', 'agent', '(agent action) archived email:m1', 'email:m1', 'archived', 'inbox', {
            source: 'mailbox:rich',
          }),
        ],
        expect: { holds: false },
      },
      {
        id: 's4',
        at: at('01-04T09:46'),
        note: 'agent archives m2',
        facts: [
          fact('f4', 'agent', '(agent action) archived email:m2', 'email:m2', 'archived', 'inbox', {
            source: 'mailbox:rich',
          }),
        ],
        expect: { holds: true },
      },
      {
        id: 's5',
        at: at('01-04T10:00'),
        note: 'near miss: chat mentions email',
        facts: [
          fact('f5', 'alice', 'Did you see my email?', 'rich', 'saw', 'email', {
            mood: 'interrogative',
            polarity: '?',
            force: 'directive',
          }),
        ],
        expect: { wake: false, holds: true, achieved: false },
      },
      {
        id: 's6',
        at: at('01-04T11:00'),
        note: 'third email',
        facts: [
          fact('f6', 'dan@example.com', 'Subject: Contract draft', 'email:m3', 'received', 'inbox', {
            source: 'mailbox:rich',
          }),
        ],
        expect: { wake: true, holds: false, achieved: false },
      },
    ],
  },
  {
    n: 5,
    goal: 'Complete my taxes by April 15',
    owner: 'rich',
    createdAt: at('02-01T09:00'),
    context: 'Deadline is 2027-04-15.',
    steps: [
      {
        id: 's1',
        at: at('02-01T09:05'),
        note: 'judgment created sub-goals',
        subgoals: ['g_w2', 'g_return', 'g_accountant'],
        status: { g_w2: 'active', g_return: 'active', g_accountant: 'active' },
        expect: { achieved: false },
      },
      { id: 's2', at: at('03-01T09:00'), note: 'tick 45d before deadline', expect: { achieved: false } },
      {
        id: 's3',
        at: at('03-10T09:00'),
        note: 'near miss: Alice filed HER taxes',
        facts: [fact('f1', 'alice', 'I filed my taxes already', 'alice', 'filed', 'taxes')],
        expect: { achieved: false },
      },
      {
        id: 's4',
        at: at('03-12T09:00'),
        note: 'owner progress fact',
        facts: [fact('f2', 'rich', 'I uploaded my W-2s to the tax folder', 'rich', 'uploaded', 'W-2s')],
        expect: { achieved: false },
      },
      {
        id: 's5',
        at: at('03-12T09:10'),
        note: 'sub-goal achieved',
        status: { g_w2: 'achieved' },
        expect: { wake: true, achieved: false },
      },
      { id: 's6', at: at('04-08T09:00'), note: 'tick 7d before', expect: { achieved: false } },
      { id: 's7', at: at('04-14T09:00'), note: 'tick 1d before', expect: { achieved: false } },
      {
        id: 's8',
        at: at('04-14T12:00'),
        note: 'remaining sub-goals achieved',
        status: { g_return: 'achieved', g_accountant: 'achieved' },
        expect: { achieved: null },
      },
      {
        id: 's9',
        at: at('04-14T15:00'),
        note: 'accountant filed the return',
        facts: [
          fact('f3', 'accountant', "I've filed your 2026 tax return", 'tax return 2026', 'filed', 'irs', {
            concerns: ['rich'],
          }),
        ],
        expect: { achieved: true },
      },
      {
        id: 's10',
        at: at('04-16T09:00'),
        note: 'after deadline, already achieved: no overdue wake',
        expect: { wake: false, achieved: true },
      },
    ],
    wakeOneOf: [['s2', 's6', 's7']],
  },
  {
    n: 6,
    goal: 'Learn French',
    owner: 'rich',
    createdAt: at('01-04T07:00'),
    context: 'Practise daily.',
    steps: [
      { id: 's1', at: at('01-04T14:00'), note: 'tick same day', expect: { wake: false, achieved: false } },
      { id: 's2', at: at('01-05T07:30'), note: 'tick next day', expect: { wake: true, achieved: false } },
      {
        id: 's3',
        at: at('01-05T12:00'),
        note: 'near miss: French fries',
        facts: [
          fact('f1', 'rich', "Let's get French fries for lunch", 'rich', 'wants', 'french fries', {
            force: 'directive',
          }),
        ],
        expect: { achieved: false },
      },
      { id: 's4', at: at('01-05T14:00'), note: 'tick same day', expect: { wake: false, achieved: false } },
      {
        id: 's5',
        at: at('01-05T18:00'),
        note: 'owner practised',
        facts: [fact('f2', 'rich', 'I did 20 minutes of French practice on Duolingo', 'rich', 'practised', 'french')],
        expect: { achieved: false },
      },
      { id: 's6', at: at('01-06T07:30'), note: 'tick next day', expect: { wake: true, achieved: false } },
    ],
  },
  {
    n: 7,
    goal: 'Never book meetings on Fridays',
    owner: 'rich',
    createdAt: at('01-04T09:00'),
    steps: [
      {
        id: 's1',
        at: at('01-04T10:00'),
        note: 'Tuesday meeting',
        actions: [{ id: 'a1', kind: 'book_meeting', args: { start: '2027-01-05T10:00:00Z', title: 'Sync' } }],
        expect: { blocks: false, wake: false },
      },
      {
        id: 's2',
        at: at('01-04T10:05'),
        note: 'Friday meeting',
        actions: [{ id: 'a2', kind: 'book_meeting', args: { start: '2027-01-08T15:00:00Z', title: 'Retro' } }],
        expect: { blocks: true, wake: false },
      },
      {
        id: 's3',
        at: at('01-04T10:10'),
        note: 'near miss: Friday email',
        actions: [{ id: 'a3', kind: 'send_email', args: { sendAt: '2027-01-08T09:00:00Z', to: 'dima' } }],
        expect: { blocks: false, wake: false },
      },
      {
        id: 's4',
        at: at('01-04T10:20'),
        note: 'chat fact mentions Friday meeting',
        facts: [
          fact('f1', 'dima', "Let's meet Friday", 'dima', 'proposes', 'meeting on friday', { force: 'directive' }),
        ],
        expect: { blocks: false, wake: false },
      },
      {
        id: 's5',
        at: at('01-04T10:30'),
        note: 'move meeting to Friday (arguably blocked)',
        actions: [{ id: 'a4', kind: 'update_meeting', args: { start: '2027-01-15T11:00:00Z', title: 'Sync' } }],
        expect: { blocks: null },
      },
    ],
  },
  {
    n: 8,
    goal: 'Help me draft this PR description',
    owner: 'rich',
    session: 'session:s42',
    createdAt: at('01-04T09:00'),
    steps: [
      {
        id: 's1',
        at: at('01-04T09:01'),
        note: 'owner asks in session',
        facts: [
          fact('f1', 'rich', "Here's the diff, draft a PR description", 'agent', 'drafts', 'PR description', {
            force: 'directive',
            mood: 'imperative',
            source: 'session:s42',
          }),
        ],
        expect: { wake: true, achieved: false },
      },
      {
        id: 's2',
        at: at('01-04T09:03'),
        note: 'agent produced a draft',
        facts: [agent('g1', 'drafted', 'pr description v1')],
        expect: { achieved: false },
      },
      {
        id: 's3',
        at: at('01-04T09:05'),
        note: 'near miss: other source mentions PR descriptions',
        facts: [
          fact('f2', 'alice', 'The PR description template changed', 'pr template', 'changed', 'today', {
            source: 'chat:general',
          }),
        ],
        expect: { wake: false, achieved: false },
      },
      {
        id: 's4',
        at: at('01-04T09:07'),
        note: 'owner asks for revision',
        facts: [
          fact('f3', 'rich', 'Tighten the summary section', 'agent', 'tightens', 'summary section', {
            force: 'directive',
            mood: 'imperative',
            source: 'session:s42',
          }),
        ],
        expect: { wake: true, achieved: false },
      },
      {
        id: 's5',
        at: at('01-04T09:10'),
        note: 'owner accepts',
        facts: [
          fact('f4', 'rich', 'Looks good, posting it now', 'rich', 'posts', 'draft', {
            force: 'commissive',
            source: 'session:s42',
          }),
        ],
        expect: { achieved: true },
      },
    ],
  },
];
