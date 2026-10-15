//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { BaseError } from '@dxos/errors';
import { type RDF } from '@dxos/pipeline-rdf';
import { trim } from '@dxos/util';

import * as Builtins from './Builtins.ts';
import * as Compiler from './Compiler.ts';
import * as GoalRules from './GoalRules.ts';

/**
 * The replay gate's oracle (BRAIN.md, "Compilation"): a model call that sees only the goal's text and
 * writes a short timeline of statements with what each should do to the goal. A compilation goes active
 * only if it replays that timeline correctly; the oracle never sees the rules, so it cannot share the
 * compiler's misreading of the goal.
 */

/** One statement in a test timeline; people and things are named by the ids the goal was given. */
export const Statement = Schema.Struct({
  speaker: Schema.String,
  quote: Schema.String,
  subject: Schema.String,
  predicate: Schema.String,
  object: Schema.String,
  force: Schema.optional(Schema.Literals(['assertive', 'directive', 'commissive', 'expressive'])),
  polarity: Schema.optional(Schema.Literals(['+', '-'])),
});
export interface Statement extends Schema.Schema.Type<typeof Statement> {}

/** A step of the timeline: when it happens after the goal is set, what is said, and what should follow. */
export const Step = Schema.Struct({
  /** A duration after the goal was set, e.g. `10m`, `1h`, `3d`. */
  after: Schema.String,
  says: Schema.Array(Statement),
  /** Whether the goal should wake (be judged) at this step. */
  wake: Schema.Boolean,
  /** Whether the goal should be achieved after this step; absent when either is acceptable. */
  achieved: Schema.optional(Schema.Boolean),
  note: Schema.optional(Schema.String),
});
export interface Step extends Schema.Schema.Type<typeof Step> {}

export const Reply = Schema.Struct({ steps: Schema.Array(Step) });
export interface Reply extends Schema.Schema.Type<typeof Reply> {}

export type Person = { readonly name: string; readonly id: string };

export type Goal = {
  readonly goal: string;
  readonly instructions?: string;
  /** Id of the goal's owner. */
  readonly owner: string;
  /** People the goal may concern, with the ids statements must use for them. */
  readonly people?: ReadonlyArray<Person>;
};

/** Thrown by {@link parseReply} when the reply is not a timeline. */
export class ReplyError extends BaseError.extend('OracleReplyError', 'Oracle reply is not a timeline') {}

/** The oracle's instructions. */
export const SYSTEM_PROMPT = trim`
  You write acceptance tests for an agent's goal. A goal is a plain-text directive; a runtime will decide,
  after every statement anyone makes, whether the goal should WAKE (the agent looks at it again because
  something relevant happened) and whether it is ACHIEVED (its outcome happened). You do not see how the
  runtime decides; you only describe what a careful person would expect.

  Write a short timeline of 3 to 6 steps after the goal is set. Include at least one step that should
  wake the goal and at least one near miss that should not (the wrong person, an unrelated topic, a
  refusal or a question instead of a statement). Say only what is needed; each step usually has one
  statement.

  Each statement is one fact as an extractor would record it: who said it (speaker), the words as said
  (quote), and a subject–predicate–object triple. Name people by the ids given with the goal, exactly as
  given (e.g. "did:halo:…"); name other things with lowercase hyphenated words ("indexer-migration").
  force is assertive (states), directive (asks), commissive (promises or agrees) or expressive; polarity
  is "+" (affirmed) or "-" (denied, refused).

  Reply with JSON only:
  {"steps":[{"after":"10m","says":[{"speaker":"…","quote":"…","subject":"…","predicate":"…","object":"…","force":"assertive","polarity":"+"}],"wake":true,"achieved":false,"note":"why"}]}
  "after" is a duration since the goal was set (10m, 2h, 3d) and must increase from step to step.
  Leave "achieved" out when either answer would be acceptable.
`;

/** The user message for one goal. */
export const userMessage = ({ goal, instructions, owner, people = [] }: Goal): string =>
  [
    `Goal: "${goal}"`,
    `Owner: ${owner}`,
    instructions?.trim() ? `Instructions: ${instructions.trim()}` : undefined,
    people.length > 0
      ? `People (use these ids): ${people.map(({ name, id }) => `${name} = ${id}`).join('; ')}`
      : undefined,
  ]
    .filter((line) => line !== undefined)
    .join('\n');

const decode = Schema.decodeUnknownSync(Reply);

/**
 * Extracts the timeline from the oracle's reply; tolerates a code fence or prose around the JSON.
 * @throws ReplyError if there is no valid timeline.
 */
export const parseReply = (text: string): Reply => {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) {
    throw new ReplyError({ message: 'the reply has no JSON object' });
  }
  try {
    const reply = decode(JSON.parse(text.slice(start, end + 1)));
    if (reply.steps.length === 0) {
      throw new ReplyError({ message: 'the timeline is empty' });
    }
    return reply;
  } catch (error) {
    throw error instanceof ReplyError
      ? error
      : new ReplyError({ message: error instanceof Error ? error.message : String(error) });
  }
};

/** A statement as the fact the extractor would record. */
const toFact = (statement: Statement, id: string, saidAt: string): RDF.Fact => ({
  id,
  assertion: {
    subject: { kind: 'entity', entity: statement.subject },
    predicate: statement.predicate,
    object: { kind: 'entity', entity: statement.object },
    quote: statement.quote,
  },
  factuality: { value: statement.polarity === '-' ? 'CT-' : 'CT+', polarity: statement.polarity ?? '+' },
  illocution: { force: statement.force ?? 'assertive' },
  attribution: { agent: statement.speaker, source: 'oracle', generatedAtTime: saidAt },
  recordedAt: saidAt,
  extractor: { id: 'oracle', model: 'none', version: '1' },
  sourceHash: id,
});

export type Result = {
  readonly ok: boolean;
  /** One line per expectation the rules violate. */
  readonly failures: ReadonlyArray<string>;
};

/** Replays the oracle's timeline against compiled rules; a compile error is a failure. */
export const replay = (
  source: string,
  { createdAt, steps }: { createdAt: number; steps: ReadonlyArray<Step> },
): Result => {
  let rules: GoalRules.GoalRules;
  try {
    rules = GoalRules.make({ source, createdAt });
  } catch (error) {
    if (error instanceof Compiler.CompileError) {
      return { ok: false, failures: error.diagnostics.map(Compiler.formatDiagnostic) };
    }
    throw error;
  }
  const failures: string[] = [];
  steps.forEach((step, index) => {
    const offset = Builtins.parseDuration(step.after) ?? 0;
    const saidAt = new Date(createdAt + offset).toISOString();
    const { wakes, achieved } = rules.update({
      at: createdAt + offset,
      facts: step.says.map((statement, position) => toFact(statement, `oracle-${index}-${position}`, saidAt)),
    });
    const label = `step ${index + 1} (${step.note ?? step.says.map(({ quote }) => quote).join(' / ')})`;
    if (wakes.length > 0 !== step.wake) {
      failures.push(`${label}: wake=${wakes.length > 0}, expected ${step.wake}`);
    }
    if (step.achieved !== undefined && achieved !== step.achieved) {
      failures.push(`${label}: achieved=${achieved}, expected ${step.achieved}`);
    }
  });
  return { ok: failures.length === 0, failures };
};
