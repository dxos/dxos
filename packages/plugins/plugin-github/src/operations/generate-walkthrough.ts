//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import * as LanguageModel from 'effect/unstable/ai/LanguageModel';
import * as FetchHttpClient from 'effect/unstable/http/FetchHttpClient';

import { AiService } from '@dxos/ai';
import { PROGRESS_STATUS_CANCELLED, PROGRESS_STATUS_FAILED } from '@dxos/app-toolkit';
import * as Operation from '@dxos/compute/Operation';
import * as Trace from '@dxos/compute/Trace';
import { Database, Obj, Ref } from '@dxos/echo';
import { PullRequest } from '@dxos/types';

import { GitHubOperation } from '#types';

import { GitHubPullRequestUnstoredError } from '../errors.ts';
import { GitHubApi } from '../services/index.ts';
import { GENERATE_PHASES, generateWalkthrough } from '../walkthrough/index.ts';
import { githubToken } from './pull-request.ts';

/**
 * One-shot for now; a multi-turn agent that reads the repository is the obvious next step.
 *
 * The prompt's diff budget matters more than it looks: this model's output allowance covers its
 * reasoning as well as its answer, so an unbounded diff yields a response that is all reasoning and
 * no walkthrough. See `DEFAULT_MAX_DIFF_CHARS`.
 */
const MODEL = 'com.anthropic.model.claude-sonnet-5.default';

/**
 * Generate a walkthrough of a pull request.
 *
 * Only the I/O is here — fetch the pull request, fetch its diff, run the model — because that is the
 * part a test cannot reach. The decisions live in {@link generateWalkthrough}.
 */
const handler: Operation.WithHandler<typeof GitHubOperation.GenerateWalkthrough> =
  GitHubOperation.GenerateWalkthrough.pipe(
    Operation.withHandler(
      Effect.fn(function* ({ pullRequest: pullRequestRef, force }) {
        // The invoker carries no database resolver, so the handler derives one from its input, as
        // every other operation in this plugin does.
        const pullRequest = pullRequestRef.target;
        const db = pullRequest ? Obj.getDatabase(pullRequest) : undefined;
        if (!pullRequest || !db) {
          // A preview card mints a pull request in memory rather than storing it, and there is
          // nowhere to put a walkthrough of one.
          return yield* Effect.die(new GitHubPullRequestUnstoredError());
        }

        const traceWriter = yield* Trace.TraceService;
        const progressKey = GitHubOperation.createWalkthroughProgressKey(pullRequest);
        const label = `Walkthrough of ${PullRequest.reference(pullRequest)}`;
        // Phase-first, since several meters on one object otherwise truncate to the same text.
        const report = (message: string, current: number) =>
          traceWriter.write(Trace.StatusUpdate, {
            message,
            progress: { key: progressKey, current, total: GENERATE_PHASES },
          });

        return yield* Effect.gen(function* () {
          report(label, 0);
          const { owner, repo, number } = pullRequest;
          const credentials = Layer.succeed(GitHubApi.GitHubCredentials, { token: yield* githubToken() });

          report(`${label}: reading the pull request`, 1);
          const remote = yield* GitHubApi.fetchPullRequest(owner, repo, number).pipe(Effect.provide(credentials));

          report(`${label}: fetching the diff`, 2);
          const diff = yield* GitHubApi.fetchPullRequestDiff(owner, repo, number).pipe(Effect.provide(credentials));

          const result = yield* generateWalkthrough({
            pullRequest,
            remote: {
              title: remote.title,
              description: remote.body ?? undefined,
              baseBranch: remote.base?.ref,
              headBranch: remote.head?.ref,
              commit: remote.head?.sha,
            },
            diff,
            force,
            model: MODEL,
            report,
            narrate: (prompt) =>
              LanguageModel.generateText({ prompt }).pipe(
                Effect.map((response) => response.text),
                Effect.provide(AiService.languageModel(MODEL).pipe(Layer.orDie)),
                Effect.orDie,
              ),
          });

          return {
            walkthrough: Ref.make(result.walkthrough),
            generated: result.generated,
            covered: result.covered,
            total: result.total,
          };
        }).pipe(
          // The meter stays open forever without a terminal, and the sentinel is all the UI shows —
          // the failure itself goes to the log.
          // `onExit`, not `tapError`: the model call and the database both surface as DEFECTS rather
          // than typed errors, and interruption raises neither. A meter with no terminal stays open
          // and leaves the action disabled.
          Effect.onExit((exit) =>
            Effect.sync(() => {
              if (Exit.isSuccess(exit)) {
                return;
              }
              const terminal = Cause.hasInterrupts(exit.cause) ? PROGRESS_STATUS_CANCELLED : PROGRESS_STATUS_FAILED;
              report(terminal, GENERATE_PHASES);
            }),
          ),
          Effect.provide(Database.layer(db)),
        );
      }, Effect.provide(FetchHttpClient.layer)),
    ),
  );

export default handler;
