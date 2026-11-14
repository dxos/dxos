//
// Copyright 2026 DXOS.org
//

import type * as AiError from 'effect/ai/AiError';
import * as Decision from 'effect/ai/Decision';
import * as DecisionModel from 'effect/ai/DecisionModel';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import { AiService, AiUsage, ExtractionModel, Model } from '@dxos/ai';
import { type DXN } from '@dxos/keys';
import { log } from '@dxos/log';

import { SemanticIndexError } from '../../errors.ts';
import {
  type ExtractDocument,
  type ExtractOptions,
  type FactualityValue,
  type KnownEntity,
  Ontology,
  type SystemOneThresholds,
} from '../../types/index.ts';
import { chunk } from './chunk.ts';
import { type ExtractedFact, extractChunk } from './extract.ts';

export const DEFAULT_EXTRACTION_MODEL: DXN.DXN = Model.cloudflareClairic.id;
export const DEFAULT_DECISION_MODEL: DXN.DXN = Model.cloudflareClef.id;

export const DEFAULT_THRESHOLDS: SystemOneThresholds = {
  minIsFact: 0.5,
  minPredicateConfidence: 0.6,
  minEntityConfidence: 0.5,
  maxNeedsFallback: 0.5,
};

/** The predicate answer for a relation no listed predicate states. */
export const OTHER = 'other';

/** The entity answer for a mention of no known entity. */
export const NEW = 'new';

/** System One answers a choice over at most this many criteria. */
const MAX_CHOICES = 255;

const SPEECH_ACTS = {
  statement: 'The author states or reports something.',
  question: 'The author asks about it.',
  request: 'The author asks someone to do it.',
  promise: 'The author commits to doing it.',
} as const;

const CERTAINTY = {
  certain: 'Stated as certain.',
  probable: 'Hedged as likely ("probably", "should").',
  possible: 'Hedged as possible ("might", "maybe").',
} as const;

export type SpeechAct = keyof typeof SPEECH_ACTS;
export type Certainty = keyof typeof CERTAINTY;

type Choice = { readonly label: string; readonly confidence: number };

/** System One's answers about one claim, read off the wire. */
export type ClaimDecision = {
  readonly isFact: number;
  readonly needsFallback: number;
  readonly predicate: Choice;
  readonly subject?: Choice;
  readonly object?: Choice;
  readonly speechAct: SpeechAct;
  readonly certainty: Certainty;
  readonly negated: number;
};

export type FallbackReason = 'unlisted-predicate' | 'low-confidence' | 'flagged' | 'no-spans' | 'no-claims' | 'error';

export type Route =
  | { readonly _tag: 'accept' }
  | { readonly _tag: 'drop'; readonly reason: 'not-a-fact' | 'unlisted-predicate' }
  | { readonly _tag: 'fallback'; readonly reason: FallbackReason };

/**
 * Where a claim goes: kept as System One decided it, dropped, or sent to the LLM. A closed ontology drops an
 * unlisted relation rather than paying the LLM to mint a predicate it would then drop too.
 */
export const route = (
  decision: ClaimDecision,
  { thresholds, closed }: { readonly thresholds: SystemOneThresholds; readonly closed: boolean },
): Route => {
  if (decision.isFact < thresholds.minIsFact) {
    return { _tag: 'drop', reason: 'not-a-fact' };
  }
  if (decision.predicate.label === OTHER) {
    return closed ? { _tag: 'drop', reason: 'unlisted-predicate' } : { _tag: 'fallback', reason: 'unlisted-predicate' };
  }
  if (decision.needsFallback > thresholds.maxNeedsFallback) {
    return { _tag: 'fallback', reason: 'flagged' };
  }
  if (decision.predicate.confidence < thresholds.minPredicateConfidence) {
    return { _tag: 'fallback', reason: 'low-confidence' };
  }
  return { _tag: 'accept' };
};

/** The ontology's live predicates as choice criteria, keyed by shorthand, leaving room for {@link OTHER}. */
export const predicateChoices = (ontology: Ontology.Ontology): ReadonlyMap<string, Ontology.Entry> => {
  const choices = new Map<string, Ontology.Entry>();
  for (const entry of ontology.entries) {
    if (choices.size >= MAX_CHOICES - 1) {
      break;
    }
    if (entry.replacedBy === undefined && entry.name !== OTHER && !choices.has(entry.name)) {
      choices.set(entry.name, entry);
    }
  }
  return choices;
};

/** The known entities as choice criteria, leaving room for {@link NEW}. */
export const entityChoices = (entities: ReadonlyArray<KnownEntity>): ReadonlyMap<string, KnownEntity> =>
  new Map(entities.slice(0, MAX_CHOICES - 1).map((entity, index) => [`e${index}`, entity]));

const FIRST_PERSON = /^(i|me|my|myself|i'm|i've|i'll|i'd)$/i;

/**
 * The surface form a mention is written as: a confidently linked entity's own label (so it resolves to that entity's
 * IRI), the author for a first-person mention, else the span as written.
 */
export const surfaceOf = (
  span: string,
  choice: Choice | undefined,
  {
    entities,
    author,
    thresholds,
  }: {
    readonly entities: ReadonlyMap<string, KnownEntity>;
    readonly author?: string;
    readonly thresholds: SystemOneThresholds;
  },
): string => {
  const entity = choice && choice.confidence >= thresholds.minEntityConfidence ? entities.get(choice.label) : undefined;
  if (entity) {
    return entity.label;
  }
  return author && FIRST_PERSON.test(span.trim()) ? author : span.trim();
};

const FORCE: Record<SpeechAct, Pick<ExtractedFact, 'force' | 'mood'>> = {
  statement: {},
  question: { force: 'directive', mood: 'interrogative' },
  request: { force: 'directive', mood: 'imperative' },
  promise: { force: 'commissive', mood: 'declarative' },
};

const CERTAINTY_PREFIX: Record<Certainty, 'CT' | 'PR' | 'PS'> = { certain: 'CT', probable: 'PR', possible: 'PS' };

/** A question or request commits to nothing, so it is uncommitted (`Uu`) whatever its hedging. */
export const factualityOf = (
  decision: Pick<ClaimDecision, 'speechAct' | 'certainty' | 'negated'>,
): Pick<ExtractedFact, 'factuality' | 'polarity'> => {
  if (decision.speechAct === 'question' || decision.speechAct === 'request') {
    return { factuality: 'Uu', polarity: '?' };
  }
  const polarity = decision.negated > 0.5 ? '-' : '+';
  const factuality: FactualityValue = `${CERTAINTY_PREFIX[decision.certainty]}${polarity}`;
  return { factuality, polarity };
};

/** One claim and the spans Clairic found for its roles. */
export type Claim = { readonly text: string; readonly subject: string; readonly object: string };

/** The candidate fact an accepted claim becomes, in the LLM extractor's shape so both share one fact builder. */
export const toCandidate = (
  claim: Claim,
  decision: ClaimDecision,
  {
    predicates,
    entities,
    author,
    thresholds,
    graph,
  }: {
    readonly predicates: ReadonlyMap<string, Ontology.Entry>;
    readonly entities: ReadonlyMap<string, KnownEntity>;
    readonly author?: string;
    readonly thresholds: SystemOneThresholds;
    readonly graph: string;
  },
): ExtractedFact => {
  const entry = predicates.get(decision.predicate.label);
  const linking = { entities, author, thresholds };
  return {
    subject: surfaceOf(claim.subject, decision.subject, linking),
    predicate: entry?.name ?? decision.predicate.label,
    object: surfaceOf(claim.object, decision.object, linking),
    ...factualityOf(decision),
    ...FORCE[decision.speechAct],
    confidence: decision.predicate.confidence,
    quote: claim.text,
    graph,
  };
};

//
// Requests.
//

const ClaimState = Schema.Struct({
  author: Schema.String,
  message: Schema.String,
  claim: Schema.String,
  subject: Schema.String,
  object: Schema.String,
});

const criterion = (entry: Ontology.Entry): string =>
  [
    entry.description ? `${entry.label}: ${entry.description}` : entry.label,
    entry.synonyms?.length ? `Also phrased: ${entry.synonyms.join(', ')}.` : '',
  ]
    .filter(Boolean)
    .join(' ');

const entityCriterion = (entity: KnownEntity): string =>
  [
    entity.label,
    entity.type ? `(${entity.type})` : '',
    entity.aliases?.length ? `also ${entity.aliases.join(', ')}` : '',
  ]
    .filter(Boolean)
    .join(' ');

/** The decisions asked about every claim, in one System One call. */
export const claimDecisions = (
  claim: Claim,
  author: string,
  predicates: ReadonlyMap<string, Ontology.Entry>,
  entities: ReadonlyMap<string, KnownEntity>,
): Record<string, Decision.Any> => {
  const firstPerson = `First-person words (I, me, my, we) refer to the author, ${author}.`;
  const entityCriteria = {
    ...Object.fromEntries([...entities].map(([key, entity]) => [key, entityCriterion(entity)])),
    [NEW]: 'Someone or something not in this list: a project, task, topic, thing, or a person not listed.',
  };
  return {
    is_fact: Decision.probability({
      instructions:
        'The claim states a fact, action, plan, request or question worth remembering about a person, team, project or thing.',
      criteria: { true: 'A proposition worth recording.', false: 'Filler, chit-chat, or a fragment.' },
    }),
    needs_fallback: Decision.probability({
      instructions: `Stating the claim as one relation from "${claim.subject}" to "${claim.object}" loses its meaning: it needs a paraphrase, several relations, a date, or context the message does not give.`,
    }),
    predicate: Decision.classify({
      instructions: `Which predicate states the relation in the claim from "${claim.subject}" to "${claim.object}"?`,
      criteria: {
        ...Object.fromEntries([...predicates].map(([key, entry]) => [key, criterion(entry)])),
        [OTHER]: 'None of the listed predicates states this relation.',
      },
    }),
    speech_act: Decision.classify({ instructions: 'What does the author do with the claim?', criteria: SPEECH_ACTS }),
    certainty: Decision.classify({ instructions: 'How certain is the claim as stated?', criteria: CERTAINTY }),
    negated: Decision.probability({ instructions: 'The claim says the relation does NOT hold.' }),
    ...(entities.size > 0
      ? {
          subject_entity: Decision.classify({
            instructions: `Which entity is "${claim.subject}" in the claim? ${firstPerson}`,
            criteria: entityCriteria,
          }),
          object_entity: Decision.classify({
            instructions: `Which entity is "${claim.object}" in the claim? ${firstPerson}`,
            criteria: entityCriteria,
          }),
        }
      : {}),
  };
};

type AnyAnswer = Decision.Answer<Decision.Any>;

const probabilityOf = (answer: AnyAnswer | undefined): number | undefined =>
  answer && 'probability' in answer ? answer.probability : undefined;

const choiceOf = (answer: AnyAnswer | undefined): Choice | undefined =>
  answer && 'label' in answer && !('rating' in answer)
    ? { label: answer.label, confidence: answer.confidence ?? answer.probabilities[answer.label] ?? 0 }
    : undefined;

const isKeyOf = <T extends object>(record: T, key: string | undefined): key is Extract<keyof T, string> =>
  key !== undefined && Object.hasOwn(record, key);

/** The answers as a {@link ClaimDecision}; `undefined` when the predicate went unanswered. */
export const toClaimDecision = (
  answers: Readonly<Record<string, AnyAnswer | undefined>>,
): ClaimDecision | undefined => {
  const predicate = choiceOf(answers.predicate);
  if (!predicate) {
    return undefined;
  }
  const speechAct = choiceOf(answers.speech_act)?.label;
  const certainty = choiceOf(answers.certainty)?.label;
  return {
    isFact: probabilityOf(answers.is_fact) ?? 1,
    needsFallback: probabilityOf(answers.needs_fallback) ?? 0,
    predicate,
    subject: choiceOf(answers.subject_entity),
    object: choiceOf(answers.object_entity),
    speechAct: isKeyOf(SPEECH_ACTS, speechAct) ? speechAct : 'statement',
    certainty: isKeyOf(CERTAINTY, certainty) ? certainty : 'certain',
    negated: probabilityOf(answers.negated) ?? 0,
  };
};

const CLAIM_FIELDS = {
  claims: {
    type: 'list',
    items: 'text',
    instructions:
      'Each clause that states one fact, action, plan, request or question about a person, team, project or thing. One item per proposition; skip greetings and filler.',
  },
} as const satisfies ExtractionModel.Fields;

const ROLE_FIELDS = {
  subject: {
    type: 'text',
    instructions:
      'Who or what the clause is about: the actor, or the thing described. A first-person pronoun stands for the speaker before the colon.',
  },
  object: { type: 'text', instructions: 'What the subject acts on, has, asks about, or is related to.' },
} as const satisfies ExtractionModel.Fields;

/** Strips the `author:` prefix Clairic's state carries, which a claim span may include. */
const stripAuthor = (claim: string, author: string): string =>
  claim.startsWith(`${author}:`) ? claim.slice(author.length + 1).trim() : claim.trim();

//
// Extraction.
//

/** How one document went through System One: claim counts by route, fallback calls, tokens and time. */
export type Report = {
  readonly claims: number;
  readonly accepted: number;
  readonly dropped: number;
  readonly fallbackClaims: number;
  /** Chunks System One produced nothing usable for, sent whole to the LLM. */
  readonly fallbackChunks: number;
  readonly fallbackCalls: number;
  readonly reasons: Readonly<Record<string, number>>;
  readonly extractionTokens: number;
  readonly decisionTokens: number;
  readonly systemOneMs: number;
  readonly fallbackMs: number;
};

export type Candidate = { readonly fact: ExtractedFact; readonly via: 'system-one' | 'fallback' };

type ChunkAnalysis = {
  readonly text: string;
  readonly claims: number;
  readonly accepted: readonly ExtractedFact[];
  readonly fallback: readonly string[];
  /** Why the whole chunk goes to the LLM, when it does. */
  readonly whole?: FallbackReason;
};

type Counters = {
  dropped: number;
  extractionTokens: number;
  decisionTokens: number;
  reasons: Record<string, number>;
};

const count = (counters: Counters, reason: string) => {
  counters.reasons[reason] = (counters.reasons[reason] ?? 0) + 1;
};

const analyseChunk = (
  text: string,
  doc: ExtractDocument,
  context: {
    readonly predicates: ReadonlyMap<string, Ontology.Entry>;
    readonly entities: ReadonlyMap<string, KnownEntity>;
    readonly thresholds: SystemOneThresholds;
    readonly closed: boolean;
    readonly concurrency: number;
    readonly counters: Counters;
  },
): Effect.Effect<ChunkAnalysis, AiError.AiError, ExtractionModel.ExtractionModel | DecisionModel.DecisionModel> =>
  Effect.gen(function* () {
    const author = doc.author ?? 'unknown';
    const { counters } = context;
    const claimsResult = yield* ExtractionModel.extract(CLAIM_FIELDS, { state: `${author}: ${text}` });
    counters.extractionTokens += claimsResult.usage?.inputTokens ?? 0;
    const claims = (claimsResult.answers.claims.value ?? [])
      .map((claim) => stripAuthor(claim, author))
      .filter((claim) => claim.length > 0);
    if (claims.length === 0) {
      count(counters, 'no-claims');
      return { text, claims: 0, accepted: [], fallback: [], whole: 'no-claims' };
    }

    const outcomes = yield* Effect.forEach(
      claims,
      (claimText, index) =>
        Effect.gen(function* () {
          const roles = yield* ExtractionModel.extract(ROLE_FIELDS, { state: `${author}: ${claimText}` });
          counters.extractionTokens += roles.usage?.inputTokens ?? 0;
          const subject = roles.answers.subject.value;
          const object = roles.answers.object.value;
          if (!subject || !object) {
            count(counters, 'no-spans');
            return { _tag: 'fallback' as const, claim: claimText };
          }
          const claim: Claim = { text: claimText, subject, object };
          const response = yield* DecisionModel.decide(
            Decision.make({
              input: ClaimState,
              decisions: claimDecisions(claim, author, context.predicates, context.entities),
            }),
            { input: { author, message: text, claim: claimText, subject, object } },
          );
          counters.decisionTokens += response.usage.inputTokens ?? 0;
          const decision = toClaimDecision(response.answers);
          if (!decision) {
            count(counters, 'no-decision');
            return { _tag: 'fallback' as const, claim: claimText };
          }
          const next = route(decision, { thresholds: context.thresholds, closed: context.closed });
          count(counters, next._tag === 'accept' ? 'accept' : next.reason);
          switch (next._tag) {
            case 'accept':
              return {
                _tag: 'accept' as const,
                fact: toCandidate(claim, decision, {
                  predicates: context.predicates,
                  entities: context.entities,
                  author: doc.author,
                  thresholds: context.thresholds,
                  graph: `c${index}`,
                }),
              };
            case 'drop':
              counters.dropped += 1;
              return { _tag: 'drop' as const };
            case 'fallback':
              return { _tag: 'fallback' as const, claim: claimText };
          }
        }),
      { concurrency: context.concurrency },
    );

    return {
      text,
      claims: claims.length,
      accepted: outcomes.flatMap((outcome) => (outcome._tag === 'accept' ? [outcome.fact] : [])),
      fallback: outcomes.flatMap((outcome) => (outcome._tag === 'fallback' ? [outcome.claim] : [])),
    };
  });

/** The rule that scopes a claims-only fallback request to its clauses while keeping the message as context. */
export const claimsRule = (message: string): string =>
  `The message text holds only some clauses of a longer message. Read them in the context of the full message, but extract propositions only from these clauses. Full message:\n"""\n${message}\n"""`;

/**
 * System One extraction for one document: Clairic splits each chunk into claims and finds each claim's subject and
 * object spans; the decision model picks the predicate from the ontology and links the spans to known entities.
 * Claims it is unsure of, and chunks it found no claims in, go to the LLM extractor, one request per chunk.
 */
export const extractSystemOne = (
  doc: ExtractDocument,
  options?: ExtractOptions,
): Effect.Effect<
  { readonly candidates: readonly Candidate[]; readonly report: Report },
  SemanticIndexError,
  AiService.AiService
> =>
  Effect.gen(function* () {
    const systemOne = options?.systemOne;
    const thresholds = { ...DEFAULT_THRESHOLDS, ...systemOne?.thresholds };
    const counters: Counters = { dropped: 0, extractionTokens: 0, decisionTokens: 0, reasons: {} };
    const context = {
      predicates: predicateChoices(options?.ontology ?? Ontology.DEFAULT),
      entities: entityChoices(options?.entities ?? []),
      thresholds,
      closed: options?.closed ?? false,
      concurrency: systemOne?.concurrency ?? 4,
      counters,
    };
    const models = Layer.merge(
      AiService.extractionModel(systemOne?.extractionModel ?? DEFAULT_EXTRACTION_MODEL),
      AiService.decisionModel(systemOne?.decisionModel ?? DEFAULT_DECISION_MODEL),
    );

    const [systemOneDuration, analyses] = yield* Effect.timed(
      Effect.forEach(chunk(doc.text), (text) =>
        analyseChunk(text, doc, context).pipe(
          Effect.catch((error) =>
            Effect.sync((): ChunkAnalysis => {
              log.warn('system-one: failed; chunk goes to the LLM', { source: doc.source, error });
              count(counters, 'error');
              return { text, claims: 0, accepted: [], fallback: [], whole: 'error' };
            }),
          ),
        ),
      ).pipe(
        Effect.provide(models),
        Effect.mapError((cause) => new SemanticIndexError({ message: 'System One models are not available', cause })),
      ),
    );

    const useFallback = systemOne?.fallback ?? true;
    const [fallbackDuration, fallbacks] = yield* Effect.timed(
      Effect.forEach(analyses, (analysis) => {
        if (!useFallback || (analysis.whole === undefined && analysis.fallback.length === 0)) {
          return Effect.succeed([]);
        }
        const request =
          analysis.whole === undefined
            ? extractChunk(
                { ...doc, text: analysis.fallback.join('\n') },
                { ...options, rules: [...(options?.rules ?? []), claimsRule(analysis.text)] },
              )
            : extractChunk({ ...doc, text: analysis.text }, options);
        return request.pipe(
          AiUsage.withStage('system-one-fallback'),
          Effect.map(({ facts }) => facts),
        );
      }),
    );

    const candidates: Candidate[] = [
      ...analyses.flatMap(({ accepted }) => accepted.map((fact): Candidate => ({ fact, via: 'system-one' }))),
      ...fallbacks.flat().map((fact): Candidate => ({ fact, via: 'fallback' })),
    ];
    const fallbackClaims = analyses.reduce((sum, { fallback }) => sum + fallback.length, 0);
    const report: Report = {
      claims: analyses.reduce((sum, { claims }) => sum + claims, 0),
      accepted: analyses.reduce((sum, { accepted }) => sum + accepted.length, 0),
      dropped: counters.dropped + (useFallback ? 0 : fallbackClaims),
      fallbackClaims,
      fallbackChunks: analyses.filter(({ whole }) => whole !== undefined).length,
      fallbackCalls: useFallback
        ? analyses.filter(({ whole, fallback }) => whole !== undefined || fallback.length > 0).length
        : 0,
      reasons: counters.reasons,
      extractionTokens: counters.extractionTokens,
      decisionTokens: counters.decisionTokens,
      systemOneMs: Math.round(Duration.toMillis(systemOneDuration)),
      fallbackMs: Math.round(Duration.toMillis(fallbackDuration)),
    };
    log('extract-facts: system-one', { source: doc.source, ...report });
    return { candidates, report };
  });
