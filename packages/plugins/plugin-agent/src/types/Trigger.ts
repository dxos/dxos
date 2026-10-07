//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Format, Obj, Ref } from '@dxos/echo';
import { EntityId } from '@dxos/keys';
import { normalizeEntityId } from '@dxos/pipeline-rdf';

import * as Goal from './Goal.ts';

/** pipeline-rdf's illocutionary forces; a fact without an illocution is assertive. */
export const Force = Schema.Literals(['assertive', 'directive', 'commissive', 'expressive']);
export type Force = Schema.Schema.Type<typeof Force>;

/**
 * What a fact must look like for a trigger to fire. Every field set must hold; matching is on who
 * said it, the speech act and the words it mentions rather than on predicate strings, which the
 * extractor phrases differently every time.
 */
export const FactPattern = Schema.Struct({
  speaker: Schema.optional(
    Schema.String.annotate({ description: 'The name of the person who must have said it, e.g. "Dima".' }),
  ),
  subject: Schema.optional(
    Schema.String.annotate({ description: 'Words the fact\'s subject must contain, e.g. "indexer PR".' }),
  ),
  about: Schema.optional(
    Schema.String.annotate({
      description: 'Words the fact must mention anywhere (subject, predicate, object or quote), e.g. "indexer PR".',
    }),
  ),
  force: Schema.optional(
    Force.annotate({
      description:
        'The speech act: assertive (states something happened or is so), directive (asks), commissive (promises or agrees), expressive.',
    }),
  ),
  polarity: Schema.optional(
    Schema.Literals(['+', '-']).annotate({
      description: '"+" when it must be affirmed (it happened, they agreed), "-" when denied or declined.',
    }),
  ),
  text: Schema.optional(Schema.String.annotate({ description: 'Text the quoted utterance must contain.' })),
  after: Schema.optional(
    Format.DateTime.annotate({ description: 'Only facts said after this time; defaults to when the watch starts.' }),
  ),
  before: Schema.optional(Format.DateTime.annotate({ description: 'Only facts said before this time.' })),
});

export interface FactPattern extends Schema.Schema.Type<typeof FactPattern> {}

/** Tells someone something, in the agent's chat with them. */
export const Notify = Schema.TaggedStruct('notify', {
  recipient: Ref.Ref(Obj.Unknown),
  message: Schema.String,
});

export interface Notify extends Schema.Schema.Type<typeof Notify> {}

/** What a trigger does when it fires; notify only for now. */
export const Action = Notify;
export type Action = Notify;

/**
 * Connects facts to intent: when a fact matching `when` is recorded, run `then` for the goal it
 * serves. Held in process memory, not ECHO (docs/ONTOLOGY.md §5), so it is lost on restart.
 */
export const Trigger = Schema.Struct({
  id: Schema.String,
  /** The id of the agent that watches. */
  agent: Schema.String,
  goal: Schema.optional(Ref.Ref(Goal.Goal)),
  /** The requester's words, so an update answers what they asked rather than echoing what was said. */
  request: Schema.optional(Schema.String),
  when: FactPattern,
  then: Action,
  /** Keeps watching after it fires ("keep me posted"), passing each matching fact on; its goal stays open. */
  ongoing: Schema.optional(Schema.Boolean),
  /**
   * The goal rules (`@dxos/brain` Datalog) the brain evaluates: compiled from the goal's text, or `when`
   * translated by {@link toRules}. Absent on triggers stored before rules existed; see {@link rulesOf}.
   */
  rules: Schema.optional(Schema.String),
  createdAt: Format.DateTime,
});

export interface Trigger extends Schema.Schema.Type<typeof Trigger> {}

/** A trigger id that names its agent, so a brain keyed by agent routes a removal by the id alone. */
export const makeId = (agent: string): string => `${agent}.${EntityId.random()}`;

/** The agent a {@link makeId} id names; `undefined` for an id minted before ids carried one. */
export const agentOf = (id: string): string | undefined => {
  const separator = id.indexOf('.');
  return separator > 0 ? id.slice(0, separator) : undefined;
};

/** A pattern as one line, e.g. `Dima · assertive · + · about "indexer PR"`. */
export const describePattern = ({ speaker, subject, about, force, polarity, text }: FactPattern): string =>
  [speaker, force, polarity, subject && `subject "${subject}"`, about && `about "${about}"`, text && `says "${text}"`]
    .filter((part) => part !== undefined && part.length > 0)
    .join(' · ');

/** Placeholder in a notify message for the fact that fired it. */
export const FACT_PLACEHOLDER = '{fact}';

/**
 * The text a fired trigger sends: the fact replaces the placeholder, and an ongoing watch without one
 * appends it, since each update is only useful with what changed.
 */
export const renderMessage = (trigger: Trigger, fact: string): string =>
  trigger.then.message.includes(FACT_PLACEHOLDER)
    ? trigger.then.message.replaceAll(FACT_PLACEHOLDER, fact)
    : trigger.ongoing
      ? `${trigger.then.message.replace(/[.:]\s*$/, '')}: ${fact}`
      : trigger.then.message;

//
// Rules
//

/** A Datalog string constant. */
const quote = (value: string): string => JSON.stringify(value);

/** An ISO time in the one format facts are stamped with, so comparing the strings compares the times. */
const isoTime = (time: string): string => {
  const parsed = Date.parse(time);
  return Number.isNaN(parsed) ? time : new Date(parsed).toISOString();
};

/** The label a translated pattern wakes with. */
export const MATCH_LABEL = 'match';

export type RulesOptions = {
  /** When the watch began: facts said earlier never wake it, unless the pattern sets its own `after`. */
  createdAt: string;
  /** A person's entity id (their identity DID) by name, when known; others are named by the slug of the name. */
  person?: (name: string) => string | undefined;
};

/**
 * Translates a pattern into goal rules (`@dxos/brain`): one `wake` rule binding the fact, so every new
 * matching fact wakes the subscription once. Content (`about`, `text`, and a `subject` that is not a
 * known person) is matched by `about`, the brain's stemmed keyword match over the quote and the triple.
 */
export const toRules = (pattern: FactPattern, { createdAt, person }: RulesOptions): string => {
  const body = ['fact(F, _, _, _)'];
  if (pattern.speaker !== undefined) {
    body.push(`speaker(F, ${quote(person?.(pattern.speaker) ?? normalizeEntityId(pattern.speaker))})`);
  }
  if (pattern.subject !== undefined) {
    const entity = person?.(pattern.subject);
    body.push(entity === undefined ? `about(F, ${quote(pattern.subject)})` : `fact(F, ${quote(entity)}, _, _)`);
  }
  for (const words of [pattern.about, pattern.text]) {
    if (words !== undefined && words.trim().length > 0) {
      body.push(`about(F, ${quote(words)})`);
    }
  }
  if (pattern.force !== undefined) {
    body.push(`force(F, ${quote(pattern.force)})`);
  }
  if (pattern.polarity !== undefined) {
    body.push(`polarity(F, ${quote(pattern.polarity)})`);
  }
  body.push('saidAt(F, T)', `T >= ${quote(isoTime(pattern.after ?? createdAt))}`);
  if (pattern.before !== undefined) {
    body.push(`T < ${quote(isoTime(pattern.before))}`);
  }
  return `wake(${MATCH_LABEL}) :- ${body.join(', ')}.`;
};

/** The rules a trigger is evaluated by: its own, or its pattern translated with names as slugs. */
export const rulesOf = (trigger: Trigger): string =>
  trigger.rules ?? toRules(trigger.when, { createdAt: trigger.createdAt });
