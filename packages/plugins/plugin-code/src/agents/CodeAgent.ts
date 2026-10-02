//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Schedule from 'effect/Schedule';
import type * as Scope from 'effect/Scope';
import * as Atom from 'effect/unstable/reactivity/Atom';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Chat } from '@dxos/assistant';
import { type Client } from '@dxos/client';
import { Database, Filter, Obj, Query } from '@dxos/echo';
import { log } from '@dxos/log';
import * as AssistantCapabilities from '@dxos/plugin-assistant/AssistantCapabilities';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import { toPublicKey } from '@dxos/protocols/buf';
import { isTauri } from '@dxos/util';

import { AgentError } from '../errors.ts';
import * as CodeCapabilities from '../types/CodeCapabilities.ts';
import * as Settings from '../types/Settings.ts';
import * as AcpAgent from './AcpAgent.ts';
import * as Workspace from './Workspace.ts';

/** How long to wait for the agent helper to appear before reporting the agent unavailable. */
const HELPER_WAIT = { attempts: 30, interval: '1 second' } as const;

/** How often finished delegations' worktrees are looked for. */
const SWEEP_INTERVAL = Duration.minutes(10);

/** Task statuses that end a delegation; `review` still waits on a person, `failed` on a retry. */
const FINISHED: ReadonlySet<string> = new Set(['done', 'cancelled', 'duplicate']);

export type Definition = {
  /** The harness id chats name (`chat.session.harness`); also the helper's agent directory. */
  id: string;
  label: string;
  icon: string;
};

/**
 * A coding agent the desktop app runs through its agent helper, as the agent-registry entry a plugin
 * contributes. Where the helper cannot run (the web app) the agent is listed but unavailable.
 */
export const make = (
  definition: Definition,
): Effect.Effect<AssistantCapabilities.Agent, never, Scope.Scope | Capability.Service> =>
  Effect.gen(function* () {
    const manager = yield* Capability.Service;
    const sessions = yield* AcpAgent.Sessions.make();
    // Kept alive: the probe sets it once, possibly while nothing is subscribed to it.
    const availability = Atom.make<AssistantCapabilities.AgentAvailability>(
      isTauri()
        ? { available: false, reason: 'looking for it on this computer' }
        : { available: false, reason: 'needs the Composer desktop app' },
    ).pipe(Atom.keepAlive);

    const helper = () => manager.getAll(CodeCapabilities.AgentHelper).at(0);
    const settings = (): Settings.Settings | undefined => {
      const [atom] = manager.getAll(CodeCapabilities.Settings);
      const [registry] = manager.getAll(Capabilities.AtomRegistry);
      return atom && registry ? registry.get(atom) : undefined;
    };

    if (isTauri()) {
      yield* probe(definition.id, helper, (value) =>
        manager.getAll(Capabilities.AtomRegistry).at(0)?.set(availability, value),
      ).pipe(Effect.forkScoped);
      yield* sweepWorktrees({
        agent: definition.id,
        sessions,
        helper,
        client: () => manager.getAll(ClientCapabilities.Client).at(0),
      }).pipe(Effect.repeat(Schedule.spaced(SWEEP_INTERVAL)), Effect.forkScoped);
    }

    const options: AcpAgent.AgentOptions = {
      id: definition.id,
      sessions,
      connect: (cwd) => {
        const current = helper();
        return current
          ? current.connect(definition.id, cwd)
          : Effect.fail(new AgentError({ message: `${definition.label} needs the Composer desktop app.` }));
      },
      workspace: (chat) =>
        Effect.gen(function* () {
          const current = settings();
          const project = Workspace.projectOf(chat);
          const folder = ((project && current?.agentRepositories?.[project.id]) ?? current?.agentWorkspace)?.trim();
          if (!folder) {
            return yield* Effect.fail(
              new AgentError({
                message: `Choose the folder ${definition.label} works in, on the project's overview or in the Code plugin settings.`,
              }),
            );
          }
          // The helper only accepts an absolute path; `~` cannot be expanded from the page.
          if (!isAbsolutePath(folder)) {
            return yield* Effect.fail(
              new AgentError({
                message: `The ${definition.label} folder must be a full path, such as /Users/me/code/project.`,
              }),
            );
          }

          // Delegated work gets a worktree of its own, so its changes stay apart from the checkout and
          // from other delegations; a chat with no tasks works in the folder itself.
          const key = Workspace.worktreeKey(chat);
          const agentHelper = helper();
          if (chat.tasks.length === 0 || !key || !agentHelper) {
            return folder;
          }
          const worktree = yield* agentHelper.worktrees.ensure({
            repository: folder,
            key,
            branch: Workspace.branchName(chat),
          });
          return worktree.path;
        }),
      mode: () => settings()?.agentPermissionMode ?? Settings.DEFAULT_AGENT_PERMISSION_MODE,
      device: () => toPublicKey(manager.getAll(ClientCapabilities.Client).at(0)?.halo.device?.deviceKey)?.toHex(),
    };

    return {
      id: definition.id,
      label: definition.label,
      icon: definition.icon,
      availability,
      makeTurnProducer: AcpAgent.makeTurnProducer(options),
      respond: ({ chat, message, requestId, optionId }) =>
        Effect.gen(function* () {
          const feed = yield* Database.load(chat.feed).pipe(Effect.option);
          if (Option.isNone(feed)) {
            log.warn('request answered for a chat without a feed', { chat: chat.id });
            return false;
          }
          return yield* AcpAgent.respond(sessions, { chat, feed: feed.value, message, requestId, optionId });
        }),
    } satisfies AssistantCapabilities.Agent;
  });

/**
 * Removes the worktrees of this agent's delegated chats whose tasks are all finished, or whose chat
 * was deleted. The branch stays, and so does a worktree with uncommitted changes or a chat the agent
 * is still connected to.
 */
const sweepWorktrees = ({
  agent,
  sessions,
  helper,
  client,
}: {
  agent: string;
  sessions: AcpAgent.Sessions;
  helper: () => CodeCapabilities.AgentHelper | undefined;
  client: () => Client | undefined;
}): Effect.Effect<void> =>
  Effect.gen(function* () {
    const agentHelper = helper();
    const spaces = client()?.spaces;
    if (!agentHelper || !spaces) {
      return;
    }
    for (const { key } of yield* agentHelper.worktrees.list) {
      const parsed = Workspace.parseWorktreeKey(key);
      // A space this device has not opened says nothing about the chat, so its worktrees wait.
      const space = parsed && spaces.get(parsed.spaceId);
      if (!parsed || !space) {
        continue;
      }
      const found = yield* Effect.promise(() =>
        space.db.query(Query.select(Filter.id(parsed.chatId))).firstOrUndefined(),
      );
      if (found && Obj.instanceOf(Chat.Chat, found)) {
        if (found.session?.harness !== agent || sessions.has(found.id)) {
          continue;
        }
        const tasks = yield* Effect.forEach(found.tasks, (ref) => Effect.promise(() => ref.tryLoad()));
        // A task that no longer resolves was deleted, which ends it as surely as finishing it.
        if (!tasks.every((task) => task === undefined || FINISHED.has(task.status ?? 'todo'))) {
          continue;
        }
      }
      const outcome = yield* agentHelper.worktrees.remove(key);
      log.info('delegation worktree swept', { key, outcome });
    }
  }).pipe(Effect.catch((error) => Effect.sync(() => log.warn('worktree sweep failed', { error }))));

const isAbsolutePath = (path: string): boolean => path.startsWith('/') || /^[A-Za-z]:[\\/]/.test(path);

/** Asks the helper whether the agent's tool is installed, waiting for the helper to start first. */
const probe = (
  id: string,
  helper: () => CodeCapabilities.AgentHelper | undefined,
  set: (value: AssistantCapabilities.AgentAvailability) => void,
): Effect.Effect<void> =>
  Effect.gen(function* () {
    for (let attempt = 0; attempt < HELPER_WAIT.attempts; attempt++) {
      const current = helper();
      if (current) {
        set(
          yield* current.agents.pipe(
            Effect.match({
              onFailure: (error): AssistantCapabilities.AgentAvailability => ({
                available: false,
                reason: error.message,
              }),
              onSuccess: (statuses): AssistantCapabilities.AgentAvailability => {
                const status = statuses.find((status) => status.id === id);
                return status?.available
                  ? { available: true }
                  : { available: false, reason: status?.reason ?? 'not included in this desktop app' };
              },
            }),
          ),
        );
        return;
      }
      yield* Effect.sleep(HELPER_WAIT.interval);
    }
    set({ available: false, reason: 'the agent helper did not start' });
  });
