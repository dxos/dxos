//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as LanguageModel from 'effect/unstable/ai/LanguageModel';
import * as FetchHttpClient from 'effect/unstable/http/FetchHttpClient';

import { AiService } from '@dxos/ai';
import { PROGRESS_STATUS_COMPLETE, PROGRESS_STATUS_FAILED } from '@dxos/app-toolkit';
import * as Operation from '@dxos/compute/Operation';
import * as Trace from '@dxos/compute/Trace';
import { Database, Filter, Obj, Ref } from '@dxos/echo';
import { Connection } from '@dxos/link';
import { PullRequest } from '@dxos/types';

import { GitHubOperation, Walkthrough } from '#types';

import { GITHUB_PROVIDER_ID } from '../constants.ts';
import { GitHubApi } from '../services/index.ts';
import { SYSTEM_PROMPT, buildPrompt, fillWalkthrough } from '../walkthrough/index.ts';

/**
 * One-shot for now; a multi-turn agent that reads the repository is the obvious next step.
 *
 * The prompt's diff budget matters more than it looks: this model's output allowance covers its
 * reasoning as well as its answer, so an unbounded diff yields a response that is all reasoning and
 * no walkthrough. See `DEFAULT_MAX_DIFF_CHARS`.
 */
const MODEL = 'com.anthropic.model.claude-sonnet-5.default';

/** Phases the progress bar counts, so the meter is determinate rather than a spinner. */
const PHASES = 5;

/**
 * Generate a walkthrough of a pull request.
 *
 * The model is given the diff but never writes any of it: it emits empty fences naming a path and a
 * line range, and {@link fillWalkthrough} splices the real hunks in afterwards. Whatever the prose
 * fails to mention is appended rather than dropped, so the artefact always accounts for the whole
 * change even when the model's reading of it is partial.
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
          return yield* Effect.die(new Error('No database for pull request ref.'));
        }

        const traceWriter = yield* Trace.TraceService;
        const progressKey = GitHubOperation.createWalkthroughProgressKey(pullRequest);
        const label = `Walkthrough of ${PullRequest.reference(pullRequest)}`;
        // Phase-first, since several meters on one object otherwise truncate to the same text.
        const report = (message: string, current: number) =>
          traceWriter.write(Trace.StatusUpdate, {
            message,
            progress: { key: progressKey, current, total: PHASES },
          });

        return yield* Effect.gen(function* () {
          report(label, 0);
          const { owner, repo, number } = pullRequest;
          const credentials = Layer.succeed(GitHubApi.GitHubCredentials, { token: yield* githubToken() });

          report(`${label}: reading the pull request`, 1);
          const remote = yield* GitHubApi.fetchPullRequest(owner, repo, number).pipe(Effect.provide(credentials));
          const commit = remote.head?.sha;

          // Regenerating against the same head cannot change the answer, so it is only work.
          const existing = yield* findWalkthrough(pullRequest);
          if (existing && !force && commit && !Walkthrough.isStale(existing, commit)) {
            report(PROGRESS_STATUS_COMPLETE, PHASES);
            return {
              walkthrough: Ref.make(existing),
              generated: false,
              covered: existing.covered ?? 0,
              total: existing.total ?? 0,
            };
          }

          report(`${label}: fetching the diff`, 2);
          const diff = yield* GitHubApi.fetchPullRequestDiff(owner, repo, number).pipe(Effect.provide(credentials));

          report(`${label}: writing the walkthrough`, 3);
          const prompt = buildPrompt({
            owner,
            repo,
            number,
            title: pullRequest.title,
            description: remote.body ?? pullRequest.description,
            baseBranch: remote.base?.ref ?? pullRequest.baseBranch,
            headBranch: remote.head?.ref ?? pullRequest.headBranch,
            diff,
          });
          // `generateText` takes no system role, so the instructions lead the prompt. Moving them to
          // a real system message is a change to make once this stops being one-shot.
          const response = yield* LanguageModel.generateText({ prompt: `${SYSTEM_PROMPT}\n\n---\n\n${prompt}` }).pipe(
            Effect.provide(AiService.model(MODEL).pipe(Layer.orDie)),
          );

          report(`${label}: filling the chunks`, 4);
          const filled = fillWalkthrough(response.text, diff);

          const walkthrough = yield* upsert(existing, {
            pullRequest: Ref.make(pullRequest),
            body: filled.body,
            commit: commit ?? '',
            generatedAt: new Date().toISOString(),
            model: MODEL,
            covered: filled.covered,
            total: filled.total,
          });

          report(PROGRESS_STATUS_COMPLETE, PHASES);
          return {
            walkthrough: Ref.make(walkthrough),
            generated: true,
            covered: filled.covered,
            total: filled.total,
          };
        }).pipe(
          // The meter stays open forever without a terminal, and the sentinel is all the UI shows —
          // the failure itself goes to the log.
          Effect.tapError((error) =>
            Effect.sync(() => {
              report(PROGRESS_STATUS_FAILED, PHASES);
              return error;
            }),
          ),
          Effect.provide(Database.layer(db)),
        );
      }, Effect.provide(FetchHttpClient.layer)),
    ),
  );

/** The walkthrough already written for this pull request, if any. */
const findWalkthrough = (pullRequest: PullRequest.PullRequest) =>
  Effect.gen(function* () {
    const uri = Obj.getURI(pullRequest, { prefer: 'absolute' }).toString();
    const walkthroughs = yield* Database.query(Filter.type(Walkthrough.Walkthrough)).run;
    for (const walkthrough of walkthroughs) {
      const target = yield* Database.load(walkthrough.pullRequest);
      if (Obj.getURI(target, { prefer: 'absolute' }).toString() === uri) {
        return walkthrough;
      }
    }

    return undefined;
  });

/** Replaces the body in place where one exists, so links to the walkthrough survive regeneration. */
const upsert = (existing: Walkthrough.Walkthrough | undefined, props: Obj.MakeProps<typeof Walkthrough.Walkthrough>) =>
  Effect.gen(function* () {
    if (!existing) {
      return yield* Database.add(Walkthrough.make(props));
    }

    // One notification for the whole replacement, rather than six — a subscriber re-rendering the
    // document between the body and the commit would show one against the other.
    return Obj.update(existing, (existing) => {
      existing.body = props.body;
      existing.commit = props.commit;
      existing.generatedAt = props.generatedAt;
      existing.model = props.model;
      existing.covered = props.covered;
      existing.total = props.total;
    });
  });

/**
 * The first GitHub connection token in the space, or empty for anonymous — which reaches any public
 * pull request, and is the only option in a space that has not connected GitHub.
 */
const githubToken = () =>
  Effect.gen(function* () {
    const connections = yield* Database.query(Filter.type(Connection.Connection)).run;
    for (const connection of connections) {
      if (connection.connectorId !== GITHUB_PROVIDER_ID) {
        continue;
      }
      const accessToken = yield* Database.load(connection.accessToken);
      if (accessToken.token) {
        return accessToken.token;
      }
    }

    return '';
  });

export default handler;
