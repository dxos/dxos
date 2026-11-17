//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';

import { Chat, TrajectoryStore } from '@dxos/assistant';
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
import { fold, pullRequestsIn, recordPullRequests, reopenTasks } from './cloud-run.ts';
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

/** The chat's record of follow-ups sent, as foreign keys, so a timer firing again never repeats one. */
const SENT_SOURCE = 'org.dxos.claude.drive-sent';

type Step = 'running' | 'idle' | 'merged' | 'fix' | 'land';

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

  const settled = yield* runner.settle(chat);
  const snapshots: PullRequestSnapshot[] = [];
  for (const { url, pullRequest } of settled) {
    const status = yield* runner.readStatus(pullRequest).pipe(Effect.exit);
    if (Exit.isSuccess(status)) {
      snapshots.push(toSnapshot(url, status.value));
    } else {
      log.warn('pull request status not read', { url, cause: Cause.pretty(status.cause) });
    }
  }

  const sent = new Set(Obj.getKeys(chat, SENT_SOURCE).map(({ id }) => id));
  const action = decide({ running: false, pullRequests: snapshots, sent });
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

/** Advances every in-flight cloud run in the space; one run's failure leaves the others to proceed. */
export const driveRuns = Effect.fnUntraced(function* <R>(runner: Runner<R>) {
  const chats = yield* activeChats();
  const runs: { chat: Ref.Ref<Chat.Chat>; step: Step | 'failed' }[] = [];
  for (const chat of chats) {
    const step = yield* driveChat<R>(chat, runner).pipe(Effect.exit);
    if (Exit.isFailure(step)) {
      log.warn('cloud run not driven', { chat: chat.id, cause: Cause.pretty(step.cause) });
    }
    runs.push({ chat: Ref.make(chat), step: Exit.isSuccess(step) ? step.value : 'failed' });
  }
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
  settle: (chat) =>
    Effect.gen(function* () {
      const feed = yield* Database.load(chat.feed);
      const urls = pullRequestsIn(yield* TrajectoryStore.messages(feed));
      return urls.length > 0 ? (yield* recordPullRequests(chat, urls)).recorded : [];
    }),
};

export const drive: Operation.WithHandler<typeof CloudRunOperation.DriveCloudRuns> =
  CloudRunOperation.DriveCloudRuns.pipe(Operation.withHandler(() => driveRuns(edgeRunner)));
