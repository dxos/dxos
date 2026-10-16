//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { AiService } from '@dxos/ai';
import * as Credential from '@dxos/compute/Credential';
import * as Operation from '@dxos/compute/Operation';
import { CrawlError } from '@dxos/crawler';
import { Database, Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { DiscordPipeline, QuestionStore } from '@dxos/pipeline-discord';
import { FactStore } from '@dxos/pipeline-rdf';
import * as BrainFactStore from '@dxos/plugin-agent/BrainFactStore';
import * as BrainService from '@dxos/plugin-agent/BrainService';

import { DiscordOperation } from '#types';

import { discordSourceLayerFromConnection, getCrawlRuntime } from '../services/index.ts';

/**
 * Runs the crawl on the session crawl runtime (which owns the SQLite-backed stores) so state
 * persists across invocations; the ambient AiService, the per-run Discord source and the target
 * agent's brain (as the pipeline's `FactStore`) are provided into that runtime explicitly.
 */
const handler: Operation.WithHandler<typeof DiscordOperation.CrawlDiscordChannels> =
  DiscordOperation.CrawlDiscordChannels.pipe(
    Operation.withHandler(
      Effect.fn(function* ({ connection, agent: agentRef, channels, descendThreads, maxDays, maxSteps, questions }) {
        if (!agentRef) {
          return yield* Effect.fail(new BrainService.AgentRequiredError());
        }
        const connectionTarget = connection.target;
        const db = connectionTarget ? Obj.getDatabase(connectionTarget) : undefined;
        invariant(db, 'No database for connection ref — invoker did not provide Database.layer.');
        const agent = yield* Database.load(agentRef).pipe(Effect.provide(Database.layer(db)));

        const ai = yield* AiService.AiService;
        // Captured here because the program runs on the crawl runtime, which lacks the operation's services.
        const credentials = yield* Credential.CredentialsService;
        const brain = yield* BrainService.BrainService;
        const sourceLayer = discordSourceLayerFromConnection(connection).pipe(
          Layer.provide(Database.layer(db)),
          Layer.provide(Layer.succeed(Credential.CredentialsService, credentials)),
        );

        const program = Effect.gen(function* () {
          const known = new Set((yield* QuestionStore.list()).map((question) => question.text));
          for (const text of questions ?? []) {
            if (!known.has(text)) {
              yield* QuestionStore.add(text);
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
        }).pipe(
          Effect.provide(sourceLayer),
          Effect.provideService(AiService.AiService, ai),
          Effect.provideService(FactStore, BrainFactStore.make(brain, agent.id)),
        );

        const summary = yield* Effect.tryPromise({
          try: () => getCrawlRuntime().runPromise(program),
          catch: (cause) => new CrawlError({ message: 'Discord crawl failed', cause }),
        });

        return { done: summary.done, errored: summary.errored, steps: summary.steps };
      }),
    ),
  );

export default handler;
