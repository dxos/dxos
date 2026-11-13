//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { AgentRegistry, type StateError, type StateStore, type Type, tapStage } from '@dxos/crawler';
import { Database, Filter, Obj, Query } from '@dxos/echo';
import { log } from '@dxos/log';
import { type Stage } from '@dxos/pipeline';
import { FactStore, RDF, hashText } from '@dxos/pipeline-rdf';
import { Person } from '@dxos/types';

import { DISCORD_SOURCE } from '../constants.ts';
import { StoreError } from '../errors.ts';
import { ExtractedQuestionStore } from '../stores/index.ts';

export type ExtractQuestionsOptions = {
  /** ECHO database: when provided, each asker is find-or-created as a `Person` (by foreign key). */
  readonly db?: Database.Database;
  /** Source namespace of each question fact's `source` DXN (default 'discord', matching fact extraction). */
  readonly sourceNamespace?: string;
};

const QUESTION_EXTRACTOR = { id: 'extract-questions', model: 'detect-questions', version: '1' } as const;

const SCHEMA_QUESTION = 'https://schema.org/Question';

/** Slug of the question node; slugs are local to their graph, so each question's graph holds its own anonymous one. */
const QUESTION_NODE = 'question';

/** One question a message asked, as {@link questionFacts} records it. */
export type AskedQuestion = {
  readonly question: string;
  /** DXN of the message, e.g. `discord:<message id>`. */
  readonly source: string;
  /** IRI of the asker (`AgentRegistry.iriForUser`), the node their other facts name too. */
  readonly agent: string;
  readonly agentLabel?: string;
  /** ISO time of the message. */
  readonly askedAt?: string;
  /** Where the question sits in the message text. */
  readonly span?: { readonly start: number; readonly end: number };
  /** Hash of the whole message text. */
  readonly sourceHash: string;
};

/**
 * The facts recording one asked question, in a named graph of its own around an anonymous question node:
 * `asker —asked→ question`, `question —is a→ schema:Question` and `question —has text→ "…"`. Later passes can add
 * structure to the same node (`question —about→ opfs`). Deterministic in its input, so a replay writes the same graph.
 */
export const questionFacts = (asked: AskedQuestion): RDF.Fact[] => {
  // The message time stands in for the record time: a wall-clock value would mint a new graph on every replay.
  const time = asked.askedAt ?? new Date(0).toISOString();
  const node: RDF.EntityTerm = { kind: 'entity', entity: QUESTION_NODE, label: asked.question };
  const base = {
    id: '',
    factuality: { value: 'CT+', polarity: '+' },
    attribution: {
      agent: asked.agent,
      ...(asked.agentLabel ? { agentLabel: asked.agentLabel } : {}),
      source: asked.source,
      generatedAtTime: time,
      ...(asked.span ? { span: asked.span } : {}),
    },
    recordedAt: time,
    extractor: QUESTION_EXTRACTOR,
    sourceHash: asked.sourceHash,
  } satisfies Omit<RDF.Fact, 'assertion'>;
  return RDF.Graph.assign(
    [
      {
        ...base,
        assertion: {
          subject: { kind: 'entity', entity: asked.agent, ...(asked.agentLabel ? { label: asked.agentLabel } : {}) },
          predicate: 'asked',
          object: node,
        },
      },
      {
        ...base,
        assertion: {
          subject: node,
          predicate: 'is a',
          object: { kind: 'entity', entity: SCHEMA_QUESTION, label: 'Question' },
        },
      },
      {
        ...base,
        assertion: { subject: node, predicate: 'has text', object: { kind: 'literal', literal: asked.question } },
      },
    ],
    { name: () => `${asked.source}#question#${hashText(asked.question)}` },
  );
};

/**
 * Deterministic question detector: sentence-level split, keep sentences that end in `?` and are
 * long enough to carry a real question (drops interjections like "eh?"). LLM-grade detection can
 * replace this behind the same stage seam later.
 */
export const detectQuestions = (text: string): string[] =>
  text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.endsWith('?') && sentence.length >= 8 && sentence.length <= 400);

/**
 * Find-or-create the ECHO Person for a question asker, keyed by the stable source-native user id,
 * and link the crawler's agent profile to it (`Profile.ref` = the Person's DXN). Idempotent.
 */
const upsertAsker = (
  db: Database.Database,
  author: Type.User,
): Effect.Effect<void, StoreError, AgentRegistry.AgentRegistry> =>
  Effect.gen(function* () {
    const key = { source: DISCORD_SOURCE, id: author.id };
    const found = yield* Database.query(Query.select(Filter.foreignKeys(Person.Person, [key]))).run.pipe(
      Effect.provide(Database.layer(db)),
    );
    const person =
      found.length > 0
        ? found[0]
        : yield* Database.add(
            Person.make({
              [Obj.Meta]: { keys: [key] },
              fullName: AgentRegistry.labelForUser(author) ?? author.id,
              ...(author.username ? { nickname: author.username } : {}),
            }),
          ).pipe(Effect.provide(Database.layer(db)));

    const agent = yield* AgentRegistry.resolve(
      AgentRegistry.identifiersForUser(author),
      AgentRegistry.labelForUser(author),
    );
    yield* AgentRegistry.setRef(agent.id, Obj.getURI(person).toString());
  }).pipe(
    Effect.catch((error) =>
      error instanceof StoreError
        ? Effect.fail(error)
        : Effect.fail(new StoreError({ message: 'Failed to upsert asker', cause: error })),
    ),
  );

/**
 * Per-message stage: extract the questions a user asked and record each
 * (user × channel × message × question) row — idempotent, so it can run on the live crawl or on a
 * replay pass over the stored working set. With a database, the asker also becomes an ECHO
 * `Person` linked from the agent registry.
 */
export const extractQuestionsStage = (
  options: ExtractQuestionsOptions = {},
): Stage.Stage<
  Type.Event,
  Type.Event,
  StateError,
  ExtractedQuestionStore.ExtractedQuestionStore | AgentRegistry.AgentRegistry | FactStore | StateStore.StateStore
> => {
  const namespace = options.sourceNamespace ?? 'discord';
  return tapStage('extract-questions', ['Message'], (event) =>
    event._tag !== 'Message'
      ? Effect.void
      : Effect.gen(function* () {
          const questions = detectQuestions(event.message.text);
          if (questions.length === 0) {
            return;
          }
          yield* Effect.forEach(
            questions,
            (question) =>
              ExtractedQuestionStore.put({
                authorId: event.message.author.id,
                ...(event.message.author.displayName ? { authorLabel: event.message.author.displayName } : {}),
                targetId: event.target.id,
                messageId: event.message.id,
                question,
                ...(event.message.createdAt ? { askedAt: event.message.createdAt } : {}),
              }).pipe(
                Effect.tap(() =>
                  Effect.sync(() =>
                    log.info('question', {
                      author: event.message.author.displayName ?? event.message.author.id,
                      target: event.target.id,
                      message: event.message.id,
                      question,
                    }),
                  ),
                ),
              ),
            { discard: true },
          );
          const { text, author } = event.message;
          const agent = yield* AgentRegistry.resolve(
            AgentRegistry.identifiersForUser(author),
            AgentRegistry.labelForUser(author),
          );
          const store = yield* FactStore;
          yield* store.putFacts(
            questions.flatMap((question) => {
              const start = text.indexOf(question);
              return questionFacts({
                question,
                source: `${namespace}:${event.message.id}`,
                agent: AgentRegistry.iriForUser(author),
                ...(agent.label ? { agentLabel: agent.label } : {}),
                ...(event.message.createdAt ? { askedAt: event.message.createdAt } : {}),
                ...(start >= 0 ? { span: { start, end: start + question.length } } : {}),
                sourceHash: hashText(text),
              });
            }),
          );
          if (options.db) {
            yield* upsertAsker(options.db, author);
          }
        }),
  );
};
