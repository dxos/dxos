//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { PROGRESS_STATUS_COMPLETE } from '@dxos/app-toolkit';
import { Database, Filter, Obj, Ref } from '@dxos/echo';
import { PullRequest } from '@dxos/types';

import { Walkthrough } from '#types';

import { fillWalkthrough } from './fill.ts';
import { SYSTEM_PROMPT, buildPrompt } from './prompt.ts';

/** What the pull request looks like on GitHub right now, as against the local mirror of it. */
export type RemoteFacts = {
  title?: string;
  description?: string;
  baseBranch?: string;
  headBranch?: string;
  /** Head SHA. Absent means the walkthrough cannot be pinned to a commit, so it is always stale. */
  commit?: string;
};

export type GenerateOptions<R = never> = {
  pullRequest: PullRequest.PullRequest;
  remote: RemoteFacts;
  /** The whole unified diff, which the chunks are filled from. */
  diff: string;
  /** Regenerate even where a walkthrough for this head already exists. */
  force?: boolean;
  /** Identifier recorded on the result, so a regression can be attributed after the default moves. */
  model: string;
  /**
   * Runs the model over the prompt. Injected so the decision logic can be tested without one, and
   * generic in its requirement so the model service it needs is DECLARED by the caller rather than
   * quietly dropped — a requirement erased here is a defect at the first real invocation.
   */
  narrate: (prompt: string) => Effect.Effect<string, never, R>;
  /** Phase reporter; `current` counts against {@link GENERATE_PHASES}. */
  report?: (message: string, current: number) => void;
};

export type GenerateResult = {
  walkthrough: Walkthrough.Walkthrough;
  /** Whether the model ran, as against an existing walkthrough being returned unchanged. */
  generated: boolean;
  covered: number;
  total: number;
};

/** Phases a caller's progress meter counts, so it is determinate rather than a spinner. */
export const GENERATE_PHASES = 5;

/**
 * Decides whether to regenerate, runs the model, fills the chunks, and stores the result.
 *
 * Split from the operation handler so the part with the decisions in it can be tested against a real
 * database without a network or a model: what the handler adds is two HTTP calls.
 */
export const generateWalkthrough = <R = never>({
  pullRequest,
  remote,
  diff,
  force,
  model,
  narrate,
  report = () => {},
}: GenerateOptions<R>): Effect.Effect<GenerateResult, never, Database.Service | R> =>
  Effect.gen(function* () {
    const existing = yield* findWalkthrough(pullRequest);

    // Regenerating against the same head cannot change the answer, so it is only work.
    if (existing && !force && remote.commit && !Walkthrough.isStale(existing, remote.commit)) {
      report(PROGRESS_STATUS_COMPLETE, GENERATE_PHASES);
      return {
        walkthrough: existing,
        generated: false,
        covered: existing.covered ?? 0,
        total: existing.total ?? 0,
      };
    }

    report('Writing the walkthrough', 3);
    const prompt = buildPrompt({
      owner: pullRequest.owner,
      repo: pullRequest.repo,
      number: pullRequest.number,
      title: remote.title ?? pullRequest.title,
      description: remote.description ?? pullRequest.description,
      baseBranch: remote.baseBranch ?? pullRequest.baseBranch,
      headBranch: remote.headBranch ?? pullRequest.headBranch,
      diff,
    });
    const narration = yield* narrate(`${SYSTEM_PROMPT}\n\n---\n\n${prompt}`);

    report('Filling the chunks', 4);
    const filled = fillWalkthrough(narration, diff);
    const walkthrough = yield* upsert(existing, {
      pullRequest: Ref.make(pullRequest),
      body: filled.body,
      commit: remote.commit ?? '',
      generatedAt: new Date().toISOString(),
      model,
      covered: filled.covered,
      total: filled.total,
    });

    report(PROGRESS_STATUS_COMPLETE, GENERATE_PHASES);
    return { walkthrough, generated: true, covered: filled.covered, total: filled.total };
  });

/** The walkthrough already written for this pull request, if any. */
export const findWalkthrough = (
  pullRequest: PullRequest.PullRequest,
): Effect.Effect<Walkthrough.Walkthrough | undefined, never, Database.Service> =>
  Database.query(Filter.type(Walkthrough.Walkthrough, { pullRequest: Ref.make(pullRequest) })).run.pipe(
    // Filtered by the ref rather than by loading every walkthrough and comparing: a space holds one
    // per reviewed pull request, which is not a handful.
    Effect.map(newestWalkthrough),
    Effect.orDie,
  );

/**
 * The newest of however many were written, ties broken by id.
 *
 * Two generations racing on one pull request both see none and both add: the check and the write
 * are separate steps, and ECHO has neither a uniqueness constraint nor an atomic upsert to close
 * that. Picking deterministically makes the duplicate inert instead — every reader converges on the
 * same object, and the next regeneration updates that one in place rather than forking again.
 */
const newestWalkthrough = (walkthroughs: readonly Walkthrough.Walkthrough[]): Walkthrough.Walkthrough | undefined =>
  walkthroughs.reduce<Walkthrough.Walkthrough | undefined>((newest, walkthrough) => {
    if (!newest) {
      return walkthrough;
    }
    const left = walkthrough.generatedAt ?? '';
    const right = newest.generatedAt ?? '';
    if (left !== right) {
      return left > right ? walkthrough : newest;
    }

    return walkthrough.id > newest.id ? walkthrough : newest;
  }, undefined);

/** Replaces the body in place where one exists, so links to the walkthrough survive regeneration. */
const upsert = (
  existing: Walkthrough.Walkthrough | undefined,
  props: Obj.MakeProps<typeof Walkthrough.Walkthrough>,
): Effect.Effect<Walkthrough.Walkthrough, never, Database.Service> =>
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
