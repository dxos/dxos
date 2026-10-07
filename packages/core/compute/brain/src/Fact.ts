//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { BaseError } from '@dxos/errors';

import { stableHash } from './internal/hash.ts';

/**
 * One position of a fact: an entity id, a label, or a literal. Mirrors BRAIN.md's `StoredTerm`, since ECHO
 * stores no non-discriminated unions.
 */
export const Term = Schema.Struct({
  entity: Schema.optional(Schema.String),
  label: Schema.optional(Schema.String),
  literal: Schema.optional(Schema.String),
});

export interface Term extends Schema.Schema.Type<typeof Term> {}

export const Polarity = Schema.Literals(['+', '-', '?']);

export type Polarity = Schema.Schema.Type<typeof Polarity>;

/** pipeline-rdf's illocutionary forces; a fact without an illocution is assertive. */
export const Force = Schema.Literals(['assertive', 'directive', 'commissive', 'expressive']);

export type Force = Schema.Schema.Type<typeof Force>;

const fields = {
  subject: Term,
  /** Open vocabulary: the store gives no predicate a special meaning. */
  predicate: Schema.String,
  object: Term,
  /** FactBank value, e.g. `CT+`. */
  factuality: Schema.optional(Schema.String),
  confidence: Schema.optional(Schema.Number),
  /** Who said it (a DXN or a name). */
  speaker: Schema.optional(Schema.String),
  /** Where it was read from: a message DXN, a URL, or a goal's own feed. */
  source: Schema.optional(Schema.String),
  /** ISO time it was said. */
  saidAt: Schema.optional(Schema.String),
  /** ISO time after which the fact no longer holds; expired facts are filtered, never deleted. */
  validTo: Schema.optional(Schema.String),
  quote: Schema.optional(Schema.String),
  /** Facts this one corrects; they stop holding once it is pushed. */
  supersedes: Schema.optional(Schema.Array(Schema.String)),
};

/**
 * A fact tuple: a flattening of pipeline-rdf's `Fact` (BRAIN.md's `FactTuple`), reduced to the fields the
 * brain reasons over. Its shape is open: any subject, predicate and object.
 */
export const Fact = Schema.Struct({
  id: Schema.String,
  polarity: Polarity,
  force: Force,
  ...fields,
});

export interface Fact extends Schema.Schema.Type<typeof Fact> {}

/** What a caller pushes: a fact whose id, polarity and force default (content hash, `+`, `assertive`). */
export const Input = Schema.Struct({
  id: Schema.optional(Schema.String),
  polarity: Schema.optional(Polarity),
  force: Schema.optional(Force),
  ...fields,
});

export interface Input extends Schema.Schema.Type<typeof Input> {}

/**
 * Selects facts; every field set must hold. A superset of plugin-agent's `FactQuery` and trigger `FactPattern`,
 * so either translates without loss.
 */
export const Pattern = Schema.Struct({
  /** The subject's value. */
  subject: Schema.optional(Schema.String),
  /** A value in the subject or object position. */
  entity: Schema.optional(Schema.String),
  predicate: Schema.optional(Schema.String),
  /** The object's value. */
  object: Schema.optional(Schema.String),
  source: Schema.optional(Schema.String),
  speaker: Schema.optional(Schema.String),
  force: Schema.optional(Force),
  polarity: Schema.optional(Polarity),
  /** Words the fact must mention anywhere (subject, predicate, object or quote), ignoring case. */
  about: Schema.optional(Schema.String),
  /** Text the quote must contain, ignoring case. */
  text: Schema.optional(Schema.String),
  /** Only facts said at or after this ISO time. */
  after: Schema.optional(Schema.String),
  /** Only facts said before this ISO time. */
  before: Schema.optional(Schema.String),
});

export interface Pattern extends Schema.Schema.Type<typeof Pattern> {}

/** A pushed fact failed validation, or names a fact the brain does not hold. */
export class ValidationError extends BaseError.extend('ValidationError', 'Fact is invalid.') {}

/** The value a term contributes to rules and patterns: its entity, else its label, else its literal. */
export const valueOf = (term: Term): string => term.entity ?? term.label ?? term.literal ?? '';

const decodeInput = Schema.decodeUnknownEffect(Input);

/**
 * Validates an input and fills its defaults. A fact without an id gets a hash of its content, so pushing the
 * same content twice stores it once.
 */
export const make = (input: unknown): Effect.Effect<Fact, ValidationError> =>
  decodeInput(input).pipe(
    Effect.mapError((cause) => new ValidationError({ message: String(cause), cause })),
    Effect.flatMap(({ id, polarity = '+', force = 'assertive', ...rest }) => {
      const empty = [rest.subject, rest.object].find(
        (term) => term.entity === undefined && term.label === undefined && term.literal === undefined,
      );
      if (empty !== undefined || rest.predicate.length === 0) {
        return Effect.fail(new ValidationError({ message: 'A fact needs a subject, predicate and object.' }));
      }
      const content = { polarity, force, ...rest };
      return Effect.succeed({ id: id ?? `fact-${stableHash(content)}`, ...content });
    }),
  );

/** Content equality, ignoring key order, so a re-push of the same fact is recognised as a duplicate. */
export const equals = (left: Fact, right: Fact): boolean => stableHash(left) === stableHash(right);

const timeOf = (iso: string | undefined): number | undefined => {
  const time = iso === undefined ? Number.NaN : Date.parse(iso);
  return Number.isNaN(time) ? undefined : time;
};

/** The fact's text, lowercased: what `about` and the `about` built-in search. */
export const haystack = (fact: Fact): string =>
  [valueOf(fact.subject), fact.predicate, valueOf(fact.object), fact.quote ?? ''].join(' ').toLowerCase();

/** True when every word of `words` occurs in the fact, ignoring case. */
export const mentions = (fact: Fact, words: string): boolean => {
  const text = haystack(fact);
  return words
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .every((word) => text.includes(word));
};

/** True when the fact satisfies every field the pattern sets. */
export const matches = (pattern: Pattern, fact: Fact): boolean => {
  const subject = valueOf(fact.subject);
  const object = valueOf(fact.object);
  const saidAt = timeOf(fact.saidAt);
  const after = timeOf(pattern.after);
  const before = timeOf(pattern.before);
  return (
    (pattern.subject === undefined || pattern.subject === subject) &&
    (pattern.entity === undefined || pattern.entity === subject || pattern.entity === object) &&
    (pattern.predicate === undefined || pattern.predicate === fact.predicate) &&
    (pattern.object === undefined || pattern.object === object) &&
    (pattern.source === undefined || pattern.source === fact.source) &&
    (pattern.speaker === undefined || pattern.speaker === fact.speaker) &&
    (pattern.force === undefined || pattern.force === fact.force) &&
    (pattern.polarity === undefined || pattern.polarity === fact.polarity) &&
    (pattern.about === undefined || mentions(fact, pattern.about)) &&
    (pattern.text === undefined || (fact.quote ?? '').toLowerCase().includes(pattern.text.toLowerCase())) &&
    (after === undefined || (saidAt !== undefined && saidAt >= after)) &&
    (before === undefined || (saidAt !== undefined && saidAt < before))
  );
};

/** One line for logs and judgments, e.g. `dima · commissive + · dima will_help agent plugin`. */
export const format = (fact: Fact): string =>
  [fact.speaker, `${fact.force} ${fact.polarity}`, `${valueOf(fact.subject)} ${fact.predicate} ${valueOf(fact.object)}`]
    .filter((part) => part !== undefined)
    .join(' · ');
