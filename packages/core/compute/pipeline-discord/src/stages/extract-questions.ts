//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import {
  AgentRegistry,
  type StateError,
  type StateStore,
  type Type,
  identifiersForUser,
  labelForUser,
  tapStage,
} from '@dxos/crawler';
import { Database, Filter, Obj, Query } from '@dxos/echo';
import { log } from '@dxos/log';
import { type Stage } from '@dxos/pipeline';
import { Person } from '@dxos/types';

import { DISCORD_SOURCE } from '../constants';
import { StoreError } from '../errors';
import { ExtractedQuestionStore } from '../stores';

export type ExtractQuestionsOptions = {
  /** ECHO database: when provided, each asker is find-or-created as a `Person` (by foreign key). */
  readonly db?: Database.Database;
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
const upsertAsker = (db: Database.Database, author: Type.User): Effect.Effect<void, StoreError, AgentRegistry> =>
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
              fullName: labelForUser(author) ?? author.id,
              ...(author.username ? { nickname: author.username } : {}),
            }),
          ).pipe(Effect.provide(Database.layer(db)));

    const registry = yield* AgentRegistry;
    const agent = yield* registry.resolve(identifiersForUser(author), labelForUser(author));
    yield* registry.setRef(agent.id, Obj.getURI(person).toString());
  }).pipe(
    Effect.catchAll((error) =>
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
): Stage.Stage<Type.Event, Type.Event, StateError, ExtractedQuestionStore | AgentRegistry | StateStore> =>
  tapStage('extract-questions', ['Message'], (event) =>
    event._tag !== 'Message'
      ? Effect.void
      : Effect.gen(function* () {
          const questions = detectQuestions(event.message.text);
          if (questions.length === 0) {
            return;
          }
          const store = yield* ExtractedQuestionStore;
          yield* Effect.forEach(
            questions,
            (question) =>
              store
                .put({
                  authorId: event.message.author.id,
                  ...(event.message.author.displayName ? { authorLabel: event.message.author.displayName } : {}),
                  targetId: event.target.id,
                  messageId: event.message.id,
                  question,
                  ...(event.message.createdAt ? { askedAt: event.message.createdAt } : {}),
                })
                .pipe(
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
          if (options.db) {
            yield* upsertAsker(options.db, event.message.author);
          }
        }),
  );
