//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';

import { type Chat, TrajectoryStore } from '@dxos/assistant';
import * as Credential from '@dxos/compute/Credential';
import * as Operation from '@dxos/compute/Operation';
import { Database, Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import * as GitHubOperation from '@dxos/plugin-github/GitHubOperation';
import * as Delegation from '@dxos/plugin-projects/Delegation';
import * as TaskOperation from '@dxos/plugin-tasks/TaskOperation';
import { type Message, type PullRequest } from '@dxos/types';

import { CloudRunOperation } from '#types';

import * as EdgeAgent from '../agents/EdgeAgent.ts';
import * as EdgeCredentials from '../agents/EdgeCredentials.ts';
import * as CodingAgentControl from '../CodingAgentControl.ts';
import { CLAUDE_CODE_EDGE_AGENT } from '../constants.ts';
import { ensureDriveTrigger } from './drive-trigger.ts';

/**
 * How long the starting call folds. Short: creating the chat and a cold bundle load already take much of an MCP
 * client's sixty seconds, and the agent works on whether or not anything is folding.
 */
const START_WINDOW_MS = 10_000;

/** How long a sync call waits for more: a cold bundle load plus this must stay inside an MCP client's sixty seconds. */
const FOLD_WINDOW_MS = 15_000;

/** The agent as an operation runs it: no Composer client, so no Composer MCP token, and the space's own tokens. */
const definition: EdgeAgent.Definition = {
  id: CLAUDE_CODE_EDGE_AGENT,
  label: 'Claude Code',
  icon: 'px--anthropic--regular',
  credentials: EdgeCredentials.credentials,
};

const PULL_REQUEST_URL = /https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/pull\/\d+/g;

const LATEST_LIMIT = 2000;

/** What the agent did last: its last text, trimmed to its end (where a turn says what it did), or the tool it called. */
export const latestText = (messages: readonly Message.Message[]): string | undefined => {
  const block = messages
    .filter((message) => message.sender.role !== 'user')
    .flatMap((message) => message.blocks)
    .findLast((block) => block._tag === 'text' || block._tag === 'toolCall');
  const latest =
    block?._tag === 'text'
      ? block.text.trim()
      : block?._tag === 'toolCall'
        ? `→ ${block.name} ${block.input}`
        : undefined;
  return latest === undefined || latest.length <= LATEST_LIMIT ? latest : `…${latest.slice(-LATEST_LIMIT)}`;
};

/** Pull request URLs the agent wrote anywhere in the chat, in the order it wrote them. */
export const pullRequestsIn = (messages: readonly Message.Message[]): string[] => {
  const urls = messages
    .filter((message) => message.sender.role !== 'user')
    .flatMap((message) =>
      message.blocks.flatMap((block) => (block._tag === 'text' ? [...block.text.matchAll(PULL_REQUEST_URL)] : [])),
    )
    .map((match) => match[0]);
  return [...new Set(urls)];
};

/**
 * Records each pull request on the run's tasks: imported into the space and refreshed from GitHub, attached to the
 * first task that takes it (a task holds one open PR, so a second PR lands on the next task), and the started tasks
 * moved to done once every pull request has merged, to review while any is open, or to blocked when the run opened
 * none. Best-effort: the PRs exist on GitHub either way. Returns whether every pull request has merged, and the
 * pull requests that were imported.
 */
export const recordPullRequests = Effect.fnUntraced(function* (chat: Chat.Chat, urls: readonly string[]) {
  const tasks = yield* Effect.forEach(chat.tasks, (ref) => Database.load(ref));
  const states: PullRequest.State[] = [];
  const recorded: { url: string; pullRequest: Ref.Ref<PullRequest.PullRequest> }[] = [];
  for (const url of urls) {
    const imported = yield* Operation.invoke(GitHubOperation.ImportPullRequest, { reference: url }).pipe(Effect.exit);
    if (Exit.isFailure(imported)) {
      log.warn('pull request not imported', { url, cause: Cause.pretty(imported.cause) });
      continue;
    }
    const { pullRequest } = imported.value;
    recorded.push({ url, pullRequest });
    // Read from GitHub, not from the stored object: the sync below writes in another bundle's copy of the space, which
    // reaches this one later, so a merge just made would still read as open here.
    const status = yield* Operation.invoke(GitHubOperation.GetPullRequestStatus, { pullRequest }).pipe(Effect.exit);
    if (Exit.isSuccess(status)) {
      states.push(status.value.state);
    } else {
      log.warn('pull request status not read', { url, cause: Cause.pretty(status.cause) });
    }
    // An import of a pull request the space already holds returns it unchanged, so the stored object needs a refresh.
    const synced = yield* Operation.invoke(GitHubOperation.SyncPullRequest, { pullRequest }).pipe(Effect.exit);
    if (Exit.isFailure(synced)) {
      log.warn('pull request not refreshed', { url, cause: Cause.pretty(synced.cause) });
    }
    for (const task of tasks) {
      const attached = yield* Operation.invoke(TaskOperation.AddArtifact, {
        task: Ref.make(task),
        object: pullRequest,
      }).pipe(Effect.exit);
      if (Exit.isSuccess(attached)) {
        break;
      }
    }
  }
  const merged = states.length > 0 && states.every((state) => state === 'merged');
  // A turn that ended without a pull request stopped on something (a refused push, a question, missing access) that
  // its chat explains, so the tasks wait on their person rather than look ready for review.
  const status = merged ? 'done' : urls.length > 0 ? 'review' : 'blocked';
  for (const task of tasks) {
    // A task already in review moves only to done: a later sync of a finished run is how a merge reaches it.
    if (task.status === 'started' || (task.status === 'review' && merged)) {
      yield* Operation.invoke(TaskOperation.UpdateTask, { task: Ref.make(task), status }).pipe(Effect.exit);
    }
  }
  return { merged, recorded };
});

/** A follow-up turn reopens the run's settled tasks, so the turn's end settles them again. */
export const reopenTasks = Effect.fnUntraced(function* (chat: Chat.Chat) {
  for (const ref of chat.tasks) {
    const task = yield* Database.load(ref);
    if (task.status === 'review' || task.status === 'blocked') {
      yield* Operation.invoke(TaskOperation.UpdateTask, { task: ref, status: 'started' }).pipe(Effect.exit);
    }
  }
});

/** Folds the run for up to `windowMs`, and records its pull requests once the turn has ended. */
export const fold = Effect.fnUntraced(function* (chat: Chat.Chat, prompt: string, windowMs: number) {
  const control = yield* CodingAgentControl.CodingAgentControl;
  // A GitHub App connection's token is custodied by EDGE; the resolver turns its placeholder into the token to lend.
  const accessTokens = Layer.succeed(Credential.AccessTokenResolver, yield* Credential.AccessTokenResolver);
  const feed = yield* Database.load(chat.feed);
  const options: EdgeAgent.Options = {
    definition,
    control: () => EdgeAgent.fromRemoteControl(control),
    accessTokens,
    // An MCP client may give up on a call; the agent works on, and the next call picks the turn up.
    detached: true,
  };
  const progress = yield* EdgeAgent.runTurnUntil(options, { chat, feed }, { prompt }, Date.now() + windowMs);
  log.info('cloud run folded', {
    chat: chat.id,
    done: progress.done,
    pending: EdgeAgent.hasPendingTurn(chat, CLAUDE_CODE_EDGE_AGENT),
  });
  // The open turn's record is what the next call picks up, so it must be stored before this invocation ends.
  yield* Database.flush();
  const messages = yield* TrajectoryStore.messages(feed);
  if (!progress.done) {
    return { chat: Ref.make(chat), done: false, latest: latestText(messages), pullRequests: [] };
  }
  const pullRequests = pullRequestsIn(messages);
  const { merged } = yield* recordPullRequests(chat, pullRequests);
  yield* Database.flush();
  return { chat: Ref.make(chat), done: true, latest: latestText(messages), pullRequests, merged };
});

export const start: Operation.WithHandler<typeof CloudRunOperation.StartCloudRun> =
  CloudRunOperation.StartCloudRun.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ tasks: taskRefs, assignee }) {
        const { requested, tasks } = yield* Delegation.selectTasks(taskRefs);
        const delegator = assignee && { identityDid: assignee.identityDid, name: assignee.name, role: 'user' as const };
        const { chat, project } = yield* Delegation.fileChat({
          requested,
          tasks,
          harness: CLAUDE_CODE_EDGE_AGENT,
          delegator,
          createChat: Delegation.createBareChat,
        });
        const prompt = yield* Delegation.brief(tasks, project);
        // A run moves on only if something keeps folding it, so the space gets a timer that does.
        yield* ensureDriveTrigger().pipe(
          Effect.catchCause((cause) =>
            Effect.sync(() => log.warn('drive trigger not set up', { cause: Cause.pretty(cause) })),
          ),
        );
        return yield* fold(chat, prompt, START_WINDOW_MS);
      }),
    ),
  );

export const syncRun: Operation.WithHandler<typeof CloudRunOperation.SyncCloudRun> =
  CloudRunOperation.SyncCloudRun.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ chat: chatRef, prompt }) {
        const chat = yield* Database.load(chatRef);
        const open = EdgeAgent.hasPendingTurn(chat, CLAUDE_CODE_EDGE_AGENT);
        if (!open && prompt !== undefined && prompt.trim().length > 0) {
          yield* reopenTasks(chat);
          return yield* fold(chat, prompt, START_WINDOW_MS);
        }
        // A fold with no open turn would start a new one from an empty prompt, so it reports what the run left and
        // re-checks its pull requests, which may have merged since.
        if (!open) {
          const feed = yield* Database.load(chat.feed);
          const messages = yield* TrajectoryStore.messages(feed);
          const pullRequests = pullRequestsIn(messages);
          const merged = pullRequests.length > 0 ? (yield* recordPullRequests(chat, pullRequests)).merged : undefined;
          yield* Database.flush();
          return { chat: chatRef, done: true, latest: latestText(messages), pullRequests, merged };
        }
        // The open turn is picked up where it is; the prompt goes again under the turn's key, which EDGE drops.
        return yield* fold(chat, '', FOLD_WINDOW_MS);
      }),
    ),
  );
