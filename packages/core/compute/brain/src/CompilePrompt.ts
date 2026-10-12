//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { BaseError } from '@dxos/errors';
import { trim } from '@dxos/util';

import * as Compiler from './Compiler.ts';
import * as Encoding from './Encoding.ts';
import * as Vocabulary from './Vocabulary.ts';

/** How a goal is satisfied; read from the goal text, never hardcoded in the runtime. */
export const Kind = Schema.Literals(['outcome', 'condition', 'constraint']);
export type Kind = Schema.Schema.Type<typeof Kind>;

/** Runtime mechanisms a goal needs: an index subscription, an alarm, a hook before each action. */
export const Driver = Schema.Literals(['fact', 'time', 'action']);
export type Driver = Schema.Schema.Type<typeof Driver>;

/** Whether `achieved(goal)` closes the goal on its own or only proposes closing it to judgment. */
export const Achievement = Schema.Literals(['rule', 'judgment']);
export type Achievement = Schema.Schema.Type<typeof Achievement>;

/** A compilation as the model returned it, before `Compiler.compile` checks the rules. */
export const Reply = Schema.Struct({
  kind: Schema.optional(Kind),
  drivers: Schema.Array(Driver),
  achievement: Schema.optional(Achievement),
  datalog: Schema.String,
  notes: Schema.optional(Schema.String),
});
export interface Reply extends Schema.Schema.Type<typeof Reply> {}

/** What the user message tells the compiler about one goal. */
export type Goal = {
  readonly goal: string;
  /** Owner-written guidance, e.g. "follow up after 2 days". */
  readonly instructions?: string;
  /** Handle of the actor who owns the goal. */
  readonly owner: string;
  /** Creation time (ISO); `elapsed(goal, …)` and `every` count from it. */
  readonly now: string;
  /** Source id of the conversation a session goal is scoped to. */
  readonly session?: string;
};

export type ReplyErrorCode =
  | 'missing-datalog'
  | 'empty-datalog'
  | 'invalid-kind'
  | 'invalid-drivers'
  | 'invalid-achievement';

/** Thrown by `parseReply` when the model's reply does not follow the output format. */
export class ReplyError extends BaseError.extend('ReplyError', 'Reply does not follow the output format') {
  constructor(
    readonly code: ReplyErrorCode,
    readonly reason: string,
  ) {
    super({ message: reason, context: { code } });
  }
}

/** One line per fact relation; typed so a new relation cannot be added without describing it. */
export const FACT_RELATION_DOCS: Readonly<Record<keyof typeof Encoding.FACT_RELATIONS, string>> = {
  fact: 'fact(F, S, P, O)         subject, predicate, object (entities are lowercase handles: rich, dima; the goal itself is the constant goal)',
  speaker: "speaker(F, X)            who said it: a handle, or agent for the agent's own actions",
  force: 'force(F, X)              assertive | directive | commissive | expressive',
  polarity: 'polarity(F, X)           "+" (affirmed), "-" (negated or refused), "?" (open question or unknown)',
  mood: 'mood(F, X)               declarative | interrogative | imperative',
  factuality: 'factuality(F, X)         "CT+" (certain), "PR+" (probable), "PS+" (possible), "Uu" (unknown), "CT-" …',
  addressee: 'addressee(F, X)          who it was said to',
  quote: 'quote(F, Text)           the words as said',
  source:
    'source(F, Src)           the message or conversation, e.g. "chat:general", "mailbox:rich", "session:s42", "goal"',
  saidAt: 'saidAt(F, T)             when it was said (ISO timestamp)',
  surface: 'surface(F, P)            the predicate as extracted, before mapping to the canonical one',
  supersedes: 'supersedes(F, Older)     F corrects the fact Older',
  validFrom: 'validFrom(F, T)          when the statement starts to hold',
  validTo: 'validTo(F, T)            when the statement stops holding',
  confidence: 'confidence(F, N)         extractor confidence 0..1',
  nature: 'nature(F, X)             epistemic | aleatory',
  recordedAt: 'recordedAt(F, T)         when it was extracted',
  pass: 'pass(F, Id)              the extraction pass that produced it',
};

/** One line per goal-state relation the runtime maintains. */
export const GOAL_RELATION_DOCS: Readonly<Record<keyof typeof Encoding.GOAL_RELATIONS, string>> = {
  subgoal: 'subgoal(goal, G)         G is a sub-goal of this goal',
  status: 'status(G, S)             current status of a sub-goal: active | paused | achieved | cancelled',
  action: 'action(A, Kind)          an action the agent is ABOUT to take (constraints only)',
  actionArg: 'actionArg(A, Key, Value) an argument of that action',
};

/** One entry per goal built-in, keyed by its name in `Builtins.make`. */
export const BUILTIN_DOCS: Readonly<Record<string, string>> = {
  about: trim`
    about(F, "text")         fact F is about the text (its quote, subject, predicate and object). If F is unbound it
                             enumerates every matching fact (an index lookup), so it can start a rule body. Keep the text
                             short: the key noun phrase ("agent plugin", "release"), not a sentence.
  `,
  concerns: trim`
    concerns(F, Entity)      fact F concerns that entity (resolved subject or beneficiary, e.g. "your tax return" said to
                             rich concerns rich). If F is unbound it enumerates the facts concerning the entity.
  `,
  elapsed: 'elapsed(Ref, Dur)        at least Dur has passed since Ref: goal (its creation), a fact id, or a timestamp',
  every: "every(Dur)               true once per period of Dur, counted from the goal's creation: a cadence",
  due: 'due(Time, Lead)          now is at or after Time minus Lead (due("2027-06-30T00:00:00Z", 0d): the deadline has passed)',
  weekday: 'weekday(Time, D)         D is monday..sunday (UTC); binds D if unbound',
  hour: 'hour(Time, H)            H is the UTC hour 0..23; binds H if unbound',
};

/** One line per head the runtime reads. */
export const HEAD_DOCS: Readonly<Record<(typeof Compiler.GOAL_HEADS)[number], string>> = {
  wake: 'wake(label)              wake the goal for judgment; label is a constant naming the reason',
  achieved: 'achieved(goal)           the outcome has been reached (outcome goals only)',
  holds: 'holds(goal)              the maintained state currently holds (condition goals only)',
  blocks: 'blocks(A)                the constraint forbids proposed action A (constraints only)',
};

type Example = {
  readonly goal: string;
  readonly owner: string;
  readonly kind: Kind;
  readonly drivers: ReadonlyArray<Driver>;
  readonly achievement?: Achievement;
  readonly datalog: string;
  readonly notes: string;
};

/** Worked examples; tests compile each one so they stay valid in the dialect. */
export const EXAMPLES: ReadonlyArray<Example> = [
  {
    goal: 'Tell me when Alice confirms the venue for the offsite',
    owner: 'rich',
    kind: 'outcome',
    drivers: ['fact'],
    achievement: 'rule',
    datalog: trim`
      % anything Alice says about the venue may matter (judgment decides)
      wake(venue_news) :- about(F, "venue"), speaker(F, alice), not achieved(goal).
      % a confirmation is an affirmed, non-question statement about the venue
      confirmed(F) :- about(F, "venue"), speaker(F, alice), polarity(F, "+"), not mood(F, interrogative).
      % the outcome is that the owner was told after a confirmation
      achieved(goal) :- confirmed(F), notified(N, goal, rich), saidAt(F, T1), saidAt(N, T2), T2 >= T1.
    `,
    notes: 'Wakes on any Alice venue statement; judgment decides whether it is a confirmation worth telling.',
  },
  {
    goal: 'Water the plants every 3 days until the end of June',
    owner: 'rich',
    kind: 'outcome',
    drivers: ['time'],
    achievement: 'rule',
    datalog: trim`
      wake(water) :- every(3d), not due("2027-06-30T23:59:59Z", 0d).
      achieved(goal) :- due("2027-06-30T23:59:59Z", 0d).
    `,
    notes: "Purely time-driven; the cadence is counted from the goal's creation.",
  },
  {
    goal: "Don't schedule anything before 9am",
    owner: 'rich',
    kind: 'constraint',
    drivers: ['action'],
    datalog: trim`
      schedules(A) :- action(A, book_meeting).
      schedules(A) :- action(A, update_meeting).
      blocks(A) :- schedules(A), actionArg(A, start, T), hour(T, H), H < 9.
    `,
    notes: 'Checked before actions only; facts never wake a constraint.',
  },
];

const formatExample = ({ goal, owner, kind, drivers, achievement, datalog, notes }: Example, index: number): string =>
  trim`
    ## Example ${String.fromCharCode(65 + index)}
    Goal: "${goal}"   Owner: ${owner}
    <kind>${kind}</kind>
    <drivers>${drivers.join(', ')}</drivers>
    ${achievement ? `<achievement>${achievement}</achievement>` : ''}
    <datalog>
    ${datalog}
    </datalog>
    <notes>${notes}</notes>
  `
    .split('\n')
    .filter((line) => line.length > 0)
    .join('\n');

export type SystemPromptOptions = {
  /** Canonical predicates the prompt offers as shorthand; defaults to the compiler's vocabulary. */
  readonly vocabulary?: Vocabulary.Vocabulary;
};

/** The compile prompt; built from the relations, built-ins and vocabulary so it cannot drift from the compiler. */
export const systemPrompt = ({ vocabulary = Compiler.defaultVocabulary() }: SystemPromptOptions = {}): string => {
  const lines = (docs: Readonly<Record<string, string>>) =>
    Object.values(docs)
      .map((doc) => `- ${doc.replaceAll('\n', '\n  ')}`)
      .join('\n');
  const canonical = vocabulary.entries
    .map(({ predicate, synonyms = [] }) =>
      synonyms.length > 0 ? `- ${predicate} (extracted as: ${synonyms.join(', ')})` : `- ${predicate}`,
    )
    .join('\n');

  return trim`
    You compile an agent's goals into rules that a cheap, deterministic runtime evaluates without a model.

    A goal is a plain-text directive owned by an actor. The runtime only needs to know WHEN to wake the goal for model
    judgment, WHEN its outcome is achieved (an outcome goal) or WHEN its state holds (a condition goal), and, for
    constraints, WHICH proposed actions it blocks. Everything else (what to write, whether to act) is judgment and is NOT
    your job. Prefer wake rules that are slightly too broad over ones that miss relevant facts: judgment filters noise, a
    missed wake is lost forever. \`achieved\` must be precise: a false achievement closes the goal.

    # Facts

    The agent's knowledge is a set of fact tuples (one per extracted statement), each with an id F. Statements by people
    and actions the agent itself takes are all facts. Predicates are open vocabulary chosen by an extractor; the
    extractor maps the known surface forms below onto canonical predicates, keeping the original in surface(F, P). Do not
    rely on any other exact predicate string: use about/2 for content.

    # Datalog dialect

    Syntax: \`head :- lit, lit, ... .\` Variables start uppercase or with \`_\` (\`_\` alone is anonymous). Constants are
    lowercase identifiers (dima, commissive, goal) or "double-quoted strings". Durations are constants such as 30m, 12h,
    2d, 1w. \`%\` starts a comment.
    Negation: \`not p(X)\` (stratified; every variable in a negated literal must be bound by a positive literal).
    Comparisons: \`X < Y\`, \`X >= Y\`, \`X = Y\`, \`X != Y\` (numbers, ISO timestamps or strings; both sides bound).
    Aggregates: \`N = count : { p(X) }\`, \`M = min T : { saidAt(F, T) }\` (count, min, max, sum).
    You may define helper predicates (lowercase, any arity). No other syntax: no disjunction (\`;\`), no arithmetic, no
    lists, no functions; write one rule per alternative instead.

    Fact relations (F is a fact id):
    ${lines(FACT_RELATION_DOCS)}

    Canonical predicates. Each may be written as shorthand: \`helps_with(S, O)\` means \`fact(_, S, helps_with, O)\` and
    \`helps_with(F, S, O)\` also binds the fact id. Use the canonical name, never a surface form, in fact/4 or shorthand:
    ${canonical}

    Goal-state relations (maintained by the runtime):
    ${lines(GOAL_RELATION_DOCS)}

    Built-ins (deterministic, evaluated by the runtime):
    ${lines(BUILTIN_DOCS)}

    Heads you produce (the runtime reads only these):
    ${lines(HEAD_DOCS)}
    You may reference achieved(goal) and holds(goal) in bodies (e.g. \`not achieved(goal)\`). Rules may not define the
    fact or goal-state relations.

    # Evaluation semantics

    Rules are re-evaluated after every new fact and every clock tick. A wake rule FIRES when it gains a satisfying binding
    of its body variables that it did not have at the previous evaluation. So:
    - a fact-driven wake rule must bind the fact variable (F), so that each new matching fact fires it again;
    - \`elapsed(goal, 3d)\` fires once when it first becomes true; \`every(1d)\` fires once per period;
    - guard time-driven wakes with \`not achieved(goal)\` so a closed goal stops waking;
    - the runtime itself wakes the goal when achieved(goal) first becomes true and whenever a sub-goal's status changes,
      so you need no wake rule for either.

    # Known vocabularies

    - Agent actions are recorded in the goal's own feed as fact(F, goal, Verb, Obj) with speaker(F, agent) and
      source(F, "goal"); the verbs are canonical predicates above (relayed, notified, awaiting, drafted, …).
    - Mailbox: an arriving email is fact(F, Msg, received, inbox) with speaker = sender address and
      source = "mailbox:<owner>"; when it leaves the inbox, fact(F, Msg, archived, inbox) or fact(F, Msg, deleted, inbox).
    - Action kinds: book_meeting, update_meeting, cancel_meeting, send_email, send_message, archive_email.
      Arguments: start, end, title, attendees (meetings); to, subject, sendAt (email and messages).
    - A session goal's conversation has source(F, "<session id>"), given with the goal.

    # Compilation guidance

    - Match on CONTENT (about) and POLARITY. Do not require a particular speaker, force or mood for achievement unless the
      goal itself names them ("get Dima to …" names Dima and a commitment). Extractor labels such as force are noisy, and
      outcomes are often reported by third parties ("the accountant filed it", "Alice says it shipped").
    - A goal about a person covers facts the person said AND facts whose subject is that person.
    - Possessive goals ("my taxes", "my inbox") concern the owner: use concerns(F, <owner>) rather than a speaker.
    - Session goals: scope wakes to the session's own source; facts from other sources do not concern them.
    - Every variable in a negated literal, a comparison or the head must be bound by a positive literal in the same rule.

    # Output format

    Reply with exactly these sections and nothing else:
    <kind>outcome | condition | constraint</kind>
    <drivers>comma-separated subset of: fact, time, action</drivers>
    <achievement>rule | judgment</achievement>   (outcome goals only: rule when achieved(goal) is reliable on its own,
                                                 judgment when the model must confirm it before the goal closes)
    <datalog>
    ...rules...
    </datalog>
    <notes>one or two sentences on the judgment calls you made, or what the rules leave to judgment</notes>

    # Worked examples

    ${EXAMPLES.map(formatExample).join('\n\n')}
  `;
};

/** The compile prompt over the default vocabulary. */
export const SYSTEM_PROMPT: string = systemPrompt();

/** The user message for one goal. */
export const userMessage = ({ goal, instructions, owner, now, session }: Goal): string =>
  [
    `Goal: "${goal}"`,
    `Owner: ${owner}`,
    `Created: ${now}`,
    session ? `Session goal; current session id: ${session}` : undefined,
    instructions?.trim() ? `Instructions: ${instructions.trim()}` : undefined,
  ]
    .filter((line) => line !== undefined)
    .join('\n');

/**
 * Extracts the rules and metadata from a model reply. Tolerates a code fence inside or instead of the `<datalog>`
 * section; metadata sections are optional, but a present one must hold a valid value.
 * @throws ReplyError if there are no rules or a metadata section is invalid.
 */
export const parseReply = (text: string): Reply => {
  const raw = section(text, 'datalog') ?? fenced(text);
  if (raw === undefined) {
    throw new ReplyError('missing-datalog', 'reply has no <datalog> section');
  }
  const datalog = fenced(raw) ?? raw;
  if (datalog.trim().length === 0) {
    throw new ReplyError('empty-datalog', 'the <datalog> section is empty');
  }

  const kind = section(text, 'kind')?.trim().toLowerCase();
  if (kind !== undefined && !isKind(kind)) {
    throw new ReplyError('invalid-kind', `unknown kind "${kind}"`);
  }

  const driversText = section(text, 'drivers');
  const drivers = (driversText ?? '')
    .split(/[,\s]+/)
    .map((driver) => driver.trim().toLowerCase())
    .filter((driver) => driver.length > 0);
  const unknown = drivers.filter((driver) => !isDriver(driver));
  if (unknown.length > 0) {
    throw new ReplyError('invalid-drivers', `unknown drivers ${unknown.map((driver) => `"${driver}"`).join(', ')}`);
  }

  const achievementText = section(text, 'achievement')?.trim().toLowerCase();
  if (achievementText !== undefined && !isAchievement(achievementText)) {
    throw new ReplyError('invalid-achievement', `unknown achievement "${achievementText}"`);
  }

  const notes = section(text, 'notes')?.trim();
  return {
    ...(kind !== undefined && isKind(kind) ? { kind } : {}),
    drivers: [...new Set(drivers.filter(isDriver))],
    ...(achievementText !== undefined && isAchievement(achievementText) ? { achievement: achievementText } : {}),
    datalog: datalog.trim(),
    ...(notes ? { notes } : {}),
  };
};

const section = (text: string, tag: string): string | undefined =>
  new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i').exec(text)?.[1];

const FENCE = /```[a-z]*\s*\n([\s\S]*?)```/i;

const fenced = (text: string): string | undefined => FENCE.exec(text)?.[1];

const isKind = (value: string): value is Kind => Schema.is(Kind)(value);

const isDriver = (value: string): value is Driver => Schema.is(Driver)(value);

const isAchievement = (value: string): value is Achievement => Schema.is(Achievement)(value);
