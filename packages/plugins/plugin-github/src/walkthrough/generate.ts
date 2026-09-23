//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { PROGRESS_STATUS_COMPLETE } from '@dxos/app-toolkit';
import { Database, Filter, Obj, Ref } from '@dxos/echo';
import { PullRequest } from '@dxos/types';

import { Walkthrough } from '#types';

import { fillWalkthrough } from './fill.ts';
import { isGeneratedFile } from './generated.ts';
import { parsePatch } from './patch.ts';
import {
  CHAPTER_SYSTEM_PROMPT,
  DEFAULT_CHAPTER_THRESHOLD_CHARS,
  PLANNER_SYSTEM_PROMPT,
  assembleWalkthrough,
  buildChapterPrompt,
  buildPlannerPrompt,
  chapterDiff,
  parsePlan,
} from './plan.ts';
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
  /**
   * Diff size past which the walkthrough is planned into chapters and narrated a chapter at a time.
   * Zero forces the two-stage path; `Infinity` forces the one-shot path.
   */
  chapterThresholdChars?: number;
};

export type GenerateResult = {
  walkthrough: Walkthrough.Walkthrough;
  /** How the body was written: one prompt, or a plan plus a prompt per chapter. */
  strategy?: 'one-shot' | 'chaptered';
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
  chapterThresholdChars = DEFAULT_CHAPTER_THRESHOLD_CHARS,
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
    const facts = {
      owner: pullRequest.owner,
      repo: pullRequest.repo,
      number: pullRequest.number,
      title: remote.title ?? pullRequest.title,
      description: remote.description ?? pullRequest.description,
      baseBranch: remote.baseBranch ?? pullRequest.baseBranch,
      headBranch: remote.headBranch ?? pullRequest.headBranch,
    };
    const chaptered =
      diff.length > chapterThresholdChars ? yield* narrateChapters(facts, diff, narrate, report) : undefined;
    const narration = chaptered ?? (yield* narrate(`${SYSTEM_PROMPT}\n\n---\n\n${buildPrompt({ ...facts, diff })}`));

    report('Filling the chunks', 4);
    const filled = fillWalkthrough(narration, diff);
    const walkthrough = yield* upsert(existing, {
      pullRequest: Ref.make(pullRequest),
      title: Walkthrough.makeTitle(pullRequest, remote.title ?? pullRequest.title),
      body: filled.body,
      commit: remote.commit ?? '',
      generatedAt: new Date().toISOString(),
      model,
      covered: filled.covered,
      total: filled.total,
    });

    report(PROGRESS_STATUS_COMPLETE, GENERATE_PHASES);
    return {
      walkthrough,
      strategy: chaptered ? ('chaptered' as const) : ('one-shot' as const),
      generated: true,
      covered: filled.covered,
      total: filled.total,
    };
  });

/**
 * Plans the chapters, then narrates each one against its own files.
 *
 * Returns undefined when the plan cannot be read, so the caller falls back to one prompt rather
 * than failing: a walkthrough of part of the change beats no walkthrough.
 */
const narrateChapters = <R>(
  facts: Parameters<typeof buildPlannerPrompt>[0],
  diff: string,
  narrate: (prompt: string) => Effect.Effect<string, never, R>,
  report: (message: string, current: number) => void,
): Effect.Effect<string | undefined, never, R> =>
  Effect.gen(function* () {
    const files = parsePatch(diff).filter((file) => !isGeneratedFile(file));
    const planned = yield* narrate(`${PLANNER_SYSTEM_PROMPT}\n\n---\n\n${buildPlannerPrompt(facts, diff)}`);
    const plan = parsePlan(
      planned,
      files.map((file) => file.path),
    );
    if (!plan) {
      return undefined;
    }

    const chapters: string[] = [];
    for (const chapter of plan.chapters) {
      report(`Writing "${chapter.title}"`, 3);
      // Serial rather than concurrent: a chapter is written against a document the reader meets in
      // order, and the model's own rate limit is the binding constraint on a large change anyway.
      const body = yield* narrate(
        `${CHAPTER_SYSTEM_PROMPT}\n\n---\n\n${buildChapterPrompt(plan, chapter, chapterDiff(files, chapter))}`,
      );
      chapters.push(body);
    }

    return assembleWalkthrough(plan, chapters);
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
 * that. Picking deterministically makes the duplicate inert instead — every reader lands on the
 * same object, and the next regeneration updates that one in place rather than forking again. The
 * loser stays in the space; removing it from a read path would delete another client's object.
 */
export const newestWalkthrough = (
  walkthroughs: readonly Walkthrough.Walkthrough[],
): Walkthrough.Walkthrough | undefined =>
  walkthroughs.reduce<Walkthrough.Walkthrough | undefined>((newest, walkthrough) => {
    if (!newest) {
      return walkthrough;
    }
    const left = generatedTime(walkthrough);
    const right = generatedTime(newest);
    if (left !== right) {
      return left > right ? walkthrough : newest;
    }

    // The id is a ULID, so it is fixed width and orders the same on every peer.
    return walkthrough.id > newest.id ? walkthrough : newest;
  }, undefined);

/**
 * Parsed rather than compared as a string: `generatedAt` is an unvalidated date-time, so a value
 * written by anything but this code can carry an offset (`+02:00`) that sorts against a `Z` value
 * the wrong way round. An unparseable or absent one sorts oldest.
 */
const generatedTime = (walkthrough: Walkthrough.Walkthrough): number => {
  const parsed = Date.parse(walkthrough.generatedAt ?? '');
  return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
};

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
      existing.title = props.title;
      existing.body = props.body;
      existing.commit = props.commit;
      existing.generatedAt = props.generatedAt;
      existing.model = props.model;
      existing.covered = props.covered;
      existing.total = props.total;
    });
  });
