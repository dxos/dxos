//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';

import { type Delegation, type DelegationStrategy } from '@dxos/agent-runtime';
import { AiContext } from '@dxos/assistant';
import { ProcessManager } from '@dxos/compute-runtime';
import * as Instructions from '@dxos/compute/Instructions';
import { Database, Feed, Filter, Obj, Query, Ref } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { EID, EntityId } from '@dxos/keys';
import { log } from '@dxos/log';
import { Message, Task } from '@dxos/types';
import { trim } from '@dxos/util';

import { RunInstructions } from '../operations/index.ts';
import { DelegationSkill } from '../skills/index.ts';
import { Agent, Chat } from '../types/index.ts';

/**
 * Resolves the chat backed by the given conversation feed, if any.
 */
const findChatForFeed = (feed: Feed.Feed): Effect.Effect<Chat.Chat | undefined, never, Database.Service> =>
  Effect.gen(function* () {
    const chats = yield* Database.query(Filter.type(Chat.Chat)).run;
    for (const chat of chats) {
      const matches = yield* Effect.gen(function* () {
        const chatFeed = yield* Database.load(chat.feed);
        return chatFeed.id === feed.id;
      }).pipe(Effect.orElseSucceed(() => false));
      if (matches) {
        return chat;
      }
    }
    return undefined;
  });

/**
 * Resolves the agent whose chat is backed by the given conversation feed, if any.
 * Plain (agentless) chats yield `undefined`.
 */
const findAgentForFeed = (feed: Feed.Feed): Effect.Effect<Agent.Agent | undefined, never, Database.Service> =>
  Effect.gen(function* () {
    const chat = yield* findChatForFeed(feed);
    return chat ? yield* Agent.loadForChat(chat) : undefined;
  });

/**
 * Normalizes an LLM-reported artifact reference (bare entity id or full ECHO URI) to a
 * fully-qualified ref in the current space. Not resolved here — it resolves lazily when read.
 */
const resolveArtifactRef = (id: string): Effect.Effect<Ref.Ref<Obj.Unknown>, Error, Database.Service> =>
  Effect.gen(function* () {
    const parsed = EID.tryParse(id);
    const candidate = (parsed ? EID.getEntityId(parsed) : undefined) ?? id;
    if (!EntityId.isValid(candidate)) {
      // Malformed LLM-reported id: fail so the caller's `orElseSucceed` drops it.
      return yield* Effect.fail(new Error(`Invalid artifact id: ${id}`));
    }
    const { db } = yield* Database.Service;
    return db.makeRef<Obj.Unknown>(EID.make({ spaceId: db.spaceId, entityId: candidate }));
  });

/**
 * Renders a sub-agent result for inclusion in a notification message.
 */
const formatResult = (value: unknown): string => (typeof value === 'string' ? value : JSON.stringify(value));

/**
 * Extracts artifact ids a sub-agent reported in its result (see the synthesized instructions
 * instructions). Tolerates the result being a string, or an object with `artifactIds`/`artifactId`.
 */
const extractArtifactIds = (value: unknown): string[] => {
  if (typeof value !== 'object' || value === null) {
    return [];
  }

  const record = value as { artifactIds?: unknown; artifactId?: unknown };
  const ids = Array.isArray(record.artifactIds)
    ? record.artifactIds
    : typeof record.artifactId === 'string'
      ? [record.artifactId]
      : [];
  return ids.filter((id): id is string => typeof id === 'string');
};

/**
 * The durable agent tasks awaiting a sub-agent for this conversation: queued (`todo`) tasks of
 * the chat's checklist whose assignee is an agent, all of whose dependencies are done. Ordinary
 * (unassigned) tasks are never spawned — delegation happens only through the delegation verbs.
 * `started` always means a live process (set at spawn), so a started agent task with no process
 * is an orphan — {@link sweepOrphanedTasks}.
 */
const findPendingTasks = (
  chat: Chat.Chat,
  activeIds: ReadonlySet<string>,
): Effect.Effect<Task.Task[], never, Database.Service> =>
  Effect.gen(function* () {
    const tasks = yield* Chat.loadTasks(chat);
    // The chat's `tasks` array is flat, so a delegated sub-task is found without descending.
    return tasks.filter(
      (task) =>
        task.assignee?.role === 'assistant' &&
        (task.status ?? 'todo') === 'todo' &&
        !activeIds.has(task.id) &&
        Task.isTaskReady(tasks, task),
    );
  });

/**
 * Fails agent tasks stuck in `started` with no live process — a crashed or never-exited
 * sub-agent (e.g. the host reloaded mid-run) must not wedge the task or the delegation loop.
 */
const sweepOrphanedTasks = (
  chat: Chat.Chat,
  activeIds: ReadonlySet<string>,
): Effect.Effect<void, never, Database.Service> =>
  Effect.gen(function* () {
    const tasks = yield* Chat.loadTasks(chat);
    const orphans = tasks.filter(
      (task) => task.assignee?.role === 'assistant' && task.status === 'started' && !activeIds.has(task.id),
    );
    if (orphans.length === 0) {
      return;
    }
    for (const task of orphans) {
      log.warn('orphaned delegated task failed', { taskId: task.id, title: task.title });
      Obj.update(task, (task) => {
        task.status = 'failed';
      });
    }
    yield* Database.flush();
  });

/**
 * Supervisor behaviour for the conversational agent: after each turn, every queued agent task
 * whose dependencies are done is run by a sub-agent (a synthesized minimal `Routine` executed via
 * `RunInstructions`), marked started at spawn; on exit the task is marked done/failed and a
 * templated message is posted back to the conversation, whose turn re-runs this reconcile — so a
 * batch of delegated tasks drains in dependency order without further prompting.
 */
export const makeDelegationStrategy = (): DelegationStrategy => ({
  reconcile: (feed, activeIds) =>
    Effect.gen(function* () {
      const chat = yield* findChatForFeed(feed);
      if (!chat) {
        return [];
      }

      yield* sweepOrphanedTasks(chat, activeIds);
      const pending = yield* findPendingTasks(chat, activeIds);
      if (pending.length === 0) {
        return [];
      }

      // Sub-agents inherit the supervisor's bound skills (so they have the same tools/
      // capabilities), minus the delegation skill itself — otherwise a sub-agent could
      // recursively delegate. Resolved from the conversation's AiContext bindings.
      const inheritedSkills = yield* Effect.gen(function* () {
        const runtime = yield* Effect.context<Database.Service>();
        const binder = yield* EffectEx.acquireReleaseResource(() => new AiContext.Binder({ feed, runtime }));
        return binder.getSkills().filter((skill) => Obj.getMeta(skill).key !== DelegationSkill.key);
      }).pipe(Effect.scoped);
      const skills = inheritedSkills.map((skill) => Ref.make(skill));

      const delegations: Delegation[] = [];
      for (const task of pending) {
        // Synthesize a minimal instructions whose goal is the task; the sub-agent runs it via RunInstructions
        // with the inherited skills bound.
        const instructions = yield* Database.add(
          Instructions.make({
            name: task.title,
            text: trim`
              Complete the following task and report the result concisely.

              If you create any documents or artifacts, call completeJob with a JSON object of the
              form { "summary": string, "artifactIds": string[] }, where artifactIds are the exact
              ids returned by the tools that created them. Otherwise return a short summary string.

              Task: ${task.title}
            `,
            skills,
          }),
        );

        // Started is stamped when the delegation is handed to the runtime — never by the
        // delegation verbs — so `started` always means a spawning/live sub-agent and an orphaned
        // `started` is detectable (see the sweep).
        Obj.update(task, (task) => {
          task.status = 'started';
        });

        delegations.push({
          id: task.id,
          spawn: Effect.gen(function* () {
            const invoker = yield* ProcessManager.ProcessOperationInvoker.Service;
            // The task ↔ process mapping lives runtime-side (the supervisor's activeIds keyed by
            // task id) — nothing is stamped on the durable task.
            const fiber = yield* invoker.invokeFiber(RunInstructions, {
              instructions: Ref.make(instructions),
              input: {},
            });
            return fiber.pid;
          }),
        });
      }
      yield* Database.flush();
      return delegations;
    }),

  onComplete: (feed, id, exit) =>
    Effect.gen(function* () {
      const chat = yield* findChatForFeed(feed);
      // Reuse the chat just resolved rather than re-scanning every chat for the same feed.
      const agent = chat ? yield* Agent.loadForChat(chat) : undefined;

      // Resolve the durable task by its id and record the outcome directly on it — the task set
      // is the working surface, so there is no separate mirror to reconcile.
      let title = id;
      const tasks = yield* Database.query(Query.select(Filter.id(id))).run.pipe(Effect.orElseSucceed(() => []));
      const task = tasks.find((candidate): candidate is Task.Task => Obj.instanceOf(Task.Task, candidate));
      if (task) {
        Obj.update(task, (task) => {
          task.status = Exit.isSuccess(exit) ? 'done' : 'failed';
        });
        title = task.title;
      }

      // Surface any artifacts the sub-agent produced as inline reference blocks in the notification
      // message, so follow-up turns can reference them (durable filing belongs to the project's
      // collection — the agent stores no artifacts).
      const artifactRefs: Ref.Ref<Obj.Unknown>[] = [];
      if (agent && Exit.isSuccess(exit)) {
        for (const artifactId of extractArtifactIds(exit.value)) {
          const ref = yield* resolveArtifactRef(artifactId).pipe(Effect.orElseSucceed(() => undefined));
          if (ref) {
            artifactRefs.push(ref);
          }
        }
      }

      // The full cause (with stack traces) goes to the log; the conversation gets the error
      // messages only, so delegation errors stay debuggable without dumping a stack in the chat.
      if (Exit.isFailure(exit)) {
        log.warn('sub-agent failed', { taskId: id, title, cause: Cause.pretty(exit.cause) });
      }
      const failureSummary = Exit.isFailure(exit)
        ? Cause.prettyErrors(exit.cause)
            .map((error) => error.message)
            .join('; ')
        : undefined;

      const text = Exit.isSuccess(exit)
        ? `The sub-agent completed "${title}".${artifactRefs.length === 0 ? ` ${formatResult(exit.value)}` : ''}`
        : `The sub-agent failed to complete "${title}": ${failureSummary || 'unknown error'}`;

      // Embed each produced artifact as a `reference` block — the chat renders these as a dx-anchor
      // tag with an inline object preview, rather than a raw `echo://` URI in the text.
      const blocks = [
        { _tag: 'text' as const, text },
        ...artifactRefs.map((reference) => ({ _tag: 'reference' as const, reference })),
      ];

      yield* Feed.append(feed, [Message.make({ sender: 'assistant', blocks })]);
    }),
});
