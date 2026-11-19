//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';

import { Chat } from '@dxos/assistant';
import * as Credential from '@dxos/compute/Credential';
import * as Operation from '@dxos/compute/Operation';
import * as Trace from '@dxos/compute/Trace';
import { Database, Filter, Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import * as GitHubOperation from '@dxos/plugin-github/GitHubOperation';
import { type PullRequest } from '@dxos/types';

import { CloudRunOperation } from '#types';

import * as EdgeAgent from '../agents/EdgeAgent.ts';
import * as CodingAgentControl from '../CodingAgentControl.ts';
import { CLAUDE_CODE_EDGE_AGENT } from '../constants.ts';
import { fold, locatePullRequests, recordPullRequests, reopenTasks } from './cloud-run.ts';
import {
  type PullRequestSnapshot,
  type PullRequestStatusLike,
  decide,
  fixPrompt,
  landPrompt,
  sentKey,
  toSnapshot,
} from './drive-decision.ts';

/** How long a drive step folds a running turn: a timer fires every few minutes, so a short look is enough. */
export const DRIVE_WINDOW_MS = 5_000;

/** How many runs a drive step advances at once: GitHub and EDGE calls wait on the network, so a few overlap well. */
export const DRIVE_CONCURRENCY = 4;

/** How long a drive step may keep starting runs: the timer's invocation must outlive the step, or it is cut off. */
export const DRIVE_BUDGET_MS = 60_000;

/** The chat's record of follow-ups sent, as foreign keys, so a timer firing again never repeats one. */
const SENT_SOURCE = 'org.dxos.claude.drive-sent';

/** The chat's record of each pull request as last seen (`url@commit#state`), so an unchanged one is not settled again. */
const SEEN_SOURCE = 'org.dxos.claude.drive-seen';

/** When the chat was last driven (epoch milliseconds), so runs a tick did not reach go first on the next. */
const DRIVEN_SOURCE = 'org.dxos.claude.drive-at';

type Step = 'running' | 'idle' | 'merged' | 'fix' | 'land';

/** What a step records of a pull request: its address, head commit and state. */
const seenKey = (snapshot: PullRequestSnapshot): string => `${snapshot.url}@${snapshot.commit ?? ''}#${snapshot.state}`;

const drivenAt = (chat: Chat.Chat): number => Number(Obj.getKeys(chat, DRIVEN_SOURCE)[0]?.id ?? 0) || 0;

/** Replaces the chat's keys of one source with `ids`. */
const replaceKeys = (chat: Chat.Chat, source: string, ids: readonly string[]): void => {
  Obj.update(chat, (chat) => {
    const keys = Obj.getMeta(chat).keys;
    for (let index = keys.length - 1; index >= 0; index--) {
      if (keys[index].source === source) {
        keys.splice(index, 1);
      }
    }
    for (const id of ids) {
      keys.push({ source, id });
    }
  });
};

/** Pins a returned literal to {@link Step}, which a generator would otherwise widen to `string`. */
const step = (value: Step): Step => value;

/** What a drive step needs from the run, apart from GitHub: the agent's turn and the run's record in the space. */
export type Runner<R> = {
  /** Whether the chat's turn is still open. */
  isRunning: (chat: Chat.Chat) => boolean;
  /** Folds the turn (or sends `prompt` as a new one) for up to `windowMs`; whether the turn has ended. */
  fold: (chat: Chat.Chat, prompt: string, windowMs: number) => Effect.Effect<{ done: boolean }, unknown, R>;
  /** Reopens the run's settled tasks and sends `prompt` as a new turn, folding it for up to `windowMs`. */
  followUp: (chat: Chat.Chat, prompt: string, windowMs: number) => Effect.Effect<unknown, unknown, R>;
  /** The ended turn's pull request URLs, each with its object when one is already attached to the run's tasks. */
  locate: (
    chat: Chat.Chat,
  ) => Effect.Effect<readonly { url: string; pullRequest?: Ref.Ref<PullRequest.PullRequest> }[], unknown, R>;
  /** Records the ended turn's pull requests on the run's tasks, and returns them. */
  settle: (
    chat: Chat.Chat,
  ) => Effect.Effect<readonly { url: string; pullRequest: Ref.Ref<PullRequest.PullRequest> }[], unknown, R>;
  /** Reads the pull request's live status from GitHub. */
  readStatus: (pullRequest: Ref.Ref<PullRequest.PullRequest>) => Effect.Effect<PullRequestStatusLike, unknown, R>;
};

/** Cloud-run chats whose tasks are still in flight. */
const activeChats = Effect.fnUntraced(function* () {
  const chats = yield* Database.query(Filter.type(Chat.Chat)).run;
  const active: Chat.Chat[] = [];
  for (const chat of chats) {
    if (chat.session?.harness !== CLAUDE_CODE_EDGE_AGENT) {
      continue;
    }
    const tasks = yield* Effect.forEach(chat.tasks, (ref) => Database.load(ref).pipe(Effect.option));
    if (
      tasks.some((task) => task._tag === 'Some' && (task.value.status === 'started' || task.value.status === 'review'))
    ) {
      active.push(chat);
    }
  }
  return active;
});

/** Advances one run by one step. */
const driveChat = Effect.fnUntraced(function* <R>(chat: Chat.Chat, runner: Runner<R>) {
  if (runner.isRunning(chat)) {
    const progress = yield* runner.fold(chat, '', DRIVE_WINDOW_MS);
    if (!progress.done) {
      return step('running');
    }
  }

  // One status read per attached pull request tells whether anything moved; the import, refresh and attach of
  // `settle` cost several GitHub calls each, so they wait for a change.
  const located = yield* runner.locate(chat);
  const snapshots = new Map<string, PullRequestSnapshot>();
  const read = Effect.fnUntraced(function* (url: string, pullRequest: Ref.Ref<PullRequest.PullRequest>) {
    const status = yield* runner.readStatus(pullRequest).pipe(Effect.exit);
    if (Exit.isSuccess(status)) {
      snapshots.set(url, toSnapshot(url, status.value));
    } else {
      log.warn('pull request status not read', { url, cause: Cause.pretty(status.cause) });
    }
  });
  for (const { url, pullRequest } of located) {
    if (pullRequest) {
      yield* read(url, pullRequest);
    }
  }

  const seen = new Set(Obj.getKeys(chat, SEEN_SOURCE).map(({ id }) => id));
  const changed = located.some(({ url }) => {
    const snapshot = snapshots.get(url);
    return snapshot === undefined || !seen.has(seenKey(snapshot));
  });
  // A run with no pull request yet is settled too: that is what moves its tasks to blocked.
  if (changed || located.length === 0) {
    for (const { url, pullRequest } of yield* runner.settle(chat)) {
      if (!snapshots.has(url)) {
        yield* read(url, pullRequest);
      }
    }
    replaceKeys(chat, SEEN_SOURCE, [...snapshots.values()].map(seenKey));
  }

  const sent = new Set(Obj.getKeys(chat, SENT_SOURCE).map(({ id }) => id));
  const action = decide({ running: false, pullRequests: [...snapshots.values()], sent });
  if (action._tag === 'none') {
    return step('idle');
  }
  if (action._tag === 'merged') {
    return step('merged');
  }

  // Recorded before sending: a lost follow-up is better than a repeated one, and the person can re-prompt.
  Obj.update(chat, (chat) => {
    for (const pullRequest of action.pullRequests) {
      Obj.getMeta(chat).keys.push({ source: SENT_SOURCE, id: sentKey(pullRequest, action._tag) });
    }
  });
  yield* Database.flush();
  const prompt = action._tag === 'fix' ? fixPrompt(action.pullRequests) : landPrompt(action.pullRequests);
  yield* runner.followUp(chat, prompt, DRIVE_WINDOW_MS);
  return step(action._tag);
});

export type DriveOptions = {
  /** How many runs to advance at once. */
  concurrency?: number;
  /** How long, in milliseconds, the step may keep starting runs; the ones it did not reach go first next time. */
  budgetMs?: number;
  /** The clock, in epoch milliseconds. */
  now?: () => number;
};

/**
 * Advances every in-flight cloud run in the space, a few at a time and the least recently driven first, and starts no
 * run once the budget is spent. One run's failure leaves the others to proceed.
 */
export const driveRuns = Effect.fnUntraced(function* <R>(runner: Runner<R>, options: DriveOptions = {}) {
  const { concurrency = DRIVE_CONCURRENCY, budgetMs = DRIVE_BUDGET_MS, now = Date.now } = options;
  const started = now();
  const chats = (yield* activeChats()).sort((left, right) => drivenAt(left) - drivenAt(right));
  const runs = yield* Effect.forEach(
    chats,
    (chat) =>
      Effect.gen(function* () {
        if (now() - started >= budgetMs) {
          return { chat: Ref.make(chat), step: 'deferred' as const };
        }
        // Stamped before the step so a run that keeps failing still yields its place to the others.
        replaceKeys(chat, DRIVEN_SOURCE, [String(now())]);
        const result = yield* driveChat<R>(chat, runner).pipe(Effect.exit);
        if (Exit.isFailure(result)) {
          log.warn('cloud run not driven', { chat: chat.id, cause: Cause.pretty(result.cause) });
        }
        return { chat: Ref.make(chat), step: Exit.isSuccess(result) ? result.value : ('failed' as const) };
      }),
    { concurrency },
  );
  yield* Database.flush();
  return { runs };
});

/** The runner for EDGE: the turn and the run's record live where `cloud-run.ts` puts them. */
const edgeRunner: Runner<
  | Database.Service
  | Trace.TraceService
  | Operation.Service
  | Credential.AccessTokenResolver
  | CodingAgentControl.CodingAgentControl
> = {
  isRunning: (chat) => EdgeAgent.hasPendingTurn(chat, CLAUDE_CODE_EDGE_AGENT),
  fold: (chat, prompt, windowMs) => fold(chat, prompt, windowMs),
  followUp: (chat, prompt, windowMs) => reopenTasks(chat).pipe(Effect.andThen(fold(chat, prompt, windowMs))),
  readStatus: (pullRequest) => Operation.invoke(GitHubOperation.GetPullRequestStatus, { pullRequest }),
  locate: (chat) => locatePullRequests(chat),
  settle: (chat) =>
    Effect.gen(function* () {
      const urls = (yield* locatePullRequests(chat)).map(({ url }) => url);
      return urls.length > 0 ? (yield* recordPullRequests(chat, urls)).recorded : [];
    }),
};

export const drive: Operation.WithHandler<typeof CloudRunOperation.DriveCloudRuns> =
  CloudRunOperation.DriveCloudRuns.pipe(Operation.withHandler(() => driveRuns(edgeRunner)));
