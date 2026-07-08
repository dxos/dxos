//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { AiService } from '@dxos/ai';
import { Operation } from '@dxos/compute';
import { CrawlError } from '@dxos/crawler';
import { Database, Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { DiscordPipeline, QuestionStore } from '@dxos/pipeline-discord';

import { discordSourceLayerFromConnection, getCrawlRuntime } from '../services';
import { DiscordOperation } from '../types';

/**
 * Runs the crawl on the session crawl runtime (which owns the SQLite-backed stores) so state
 * persists across invocations; the ambient AiService and the per-run Discord source are provided
 * into that runtime explicitly.
 */
const handler: Operation.WithHandler<typeof DiscordOperation.CrawlDiscordChannels> =
  DiscordOperation.CrawlDiscordChannels.pipe(
    Operation.withHandler(
      Effect.fn(function* ({ connection, channels, descendThreads, maxDays, maxSteps, questions }) {
        const connectionTarget = connection.target;
        const db = connectionTarget ? Obj.getDatabase(connectionTarget) : undefined;
        invariant(db, 'No database for connection ref — invoker did not provide Database.layer.');

        const ai = yield* AiService.AiService;
        const sourceLayer = discordSourceLayerFromConnection(connection).pipe(Layer.provide(Database.layer(db)));

        const program = Effect.gen(function* () {
          const store = yield* QuestionStore;
          const known = new Set((yield* store.list()).map((question) => question.text));
          for (const text of questions ?? []) {
            if (!known.has(text)) {
              yield* store.add(text);
              // Track within this batch too, so a repeated text in `questions` is added once.
              known.add(text);
            }
          }
          return yield* DiscordPipeline.run(
            {
              channels: [...channels],
              descendThreads: descendThreads ?? true,
              ...(maxDays !== undefined ? { seed: { maxDays } } : {}),
            },
            maxSteps !== undefined ? { maxSteps } : {},
          );
        }).pipe(Effect.provide(sourceLayer), Effect.provideService(AiService.AiService, ai));

        const summary = yield* Effect.tryPromise({
          try: () => getCrawlRuntime().runPromise(program),
          catch: (cause) => new CrawlError({ message: 'Discord crawl failed', cause }),
        });

        return { done: summary.done, errored: summary.errored, steps: summary.steps };
      }),
    ),
  );

export default handler;
