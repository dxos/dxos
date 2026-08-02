//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';

import { type Delegation, type DelegationStrategy } from '@dxos/agent-runtime';
import { AiContext } from '@dxos/assistant';
import { Instructions } from '@dxos/compute';
import { ProcessManager } from '@dxos/compute-runtime';
import { Database, Feed, Filter, Obj, Query, Ref } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { EID, EntityId } from '@dxos/keys';
import { log } from '@dxos/log';
import { Message, Outline, Task } from '@dxos/types';
import { trim } from '@dxos/util';

import { RunInstructions } from '../operations';
import { DelegationSkill } from '../skills';
import { Agent, Chat } from '../types';

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
 * The durable agent tasks awaiting a sub-agent for this conversation: in-progress children of the
 * working outline's task set whose assignee is an agent. Ordinary checklist items (markdown) are
 * never spawned — delegation happens only through the promotion the delegate-task tool performs.
 */
const findPendingTasks = (
  chat: Chat.Chat,
  activeIds: ReadonlySet<string>,
): Effect.Effect<Task.Task[], never, Database.Service> =>
  Effect.gen(function* () {
    const outlineRef = Chat.peekOutlineRef(chat);
    const outline = outlineRef
      ? yield* Database.load(outlineRef).pipe(Effect.orElseSucceed(() => undefined))
      : undefined;
    const taskSet = outline?.taskSet
      ? yield* Database.load(outline.taskSet).pipe(Effect.orElseSucceed(() => undefined))
      : undefined;
    if (!taskSet) {
      return [];
    }
    const children = yield* Database.query(Query.select(Filter.id(taskSet.id)).children()).run.pipe(
      Effect.orElseSucceed(() => []),
    );
    return children.filter(
      (child): child is Task.Task =>
        Obj.instanceOf(Task.Task, child) &&
        child.assignee?.role === 'assistant' &&
        child.status === 'in-progress' &&
        !activeIds.has(child.id),
    );
  });

/**
 * Supervisor behaviour for the conversational agent: after each turn, every in-progress agent
 * task not already running is run by a sub-agent (a synthesized minimal `Routine` executed via
 * `RunInstructions`); on completion the task status is updated, the checklist line is checked
 * off, and a templated message is posted back to the conversation.
 */
export const makeDelegationStrategy = (): DelegationStrategy => ({
  reconcile: (feed, activeIds) =>
    Effect.gen(function* () {
      const chat = yield* findChatForFeed(feed);
      if (!chat) {
        return [];
      }

      const pending = yield* findPendingTasks(chat, activeIds);
      if (pending.length === 0) {
        return [];
      }

      // Sub-agents inherit the supervisor's bound skills (so they have the same tools/
      // capabilities), minus the delegation skill itself — otherwise a sub-agent could
      // recursively delegate. Resolved from the conversation's AiContext bindings.
      const inheritedSkills = yield* Effect.gen(function* () {
        const runtime = yield* Effect.runtime<Database.Service>();
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
      return delegations;
    }),

  onComplete: (feed, id, exit) =>
    Effect.gen(function* () {
      const chat = yield* findChatForFeed(feed);
      // Reuse the chat just resolved rather than re-scanning every chat for the same feed.
      const agent = chat ? yield* Agent.loadForChat(chat) : undefined;

      // Resolve the durable task by its id and record the outcome; on success the checklist line
      // is checked off so the markdown mirror follows the durable state.
      let title = id;
      const tasks = yield* Database.query(Query.select(Filter.id(id))).run.pipe(Effect.orElseSucceed(() => []));
      const task = tasks.find((candidate): candidate is Task.Task => Obj.instanceOf(Task.Task, candidate));
      if (task) {
        Obj.update(task, (task) => {
          task.status = Exit.isSuccess(exit) ? 'done' : 'failed';
        });
        title = task.title;

        if (chat && Exit.isSuccess(exit)) {
          const outlineRef = Chat.peekOutlineRef(chat);
          const outline = outlineRef
            ? yield* Database.load(outlineRef).pipe(Effect.orElseSucceed(() => undefined))
            : undefined;
          const text = outline
            ? yield* Database.load(outline.content).pipe(Effect.orElseSucceed(() => undefined))
            : undefined;
          if (text) {
            Obj.update(text, (text) => {
              text.content = Outline.upsertChecklistItems(text.content, [{ title: task.title, done: true }]);
            });
          }
        }
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

      // Surface the actual failure cause (not just "failed") so delegation errors are debuggable.
      const failureCause = Exit.isFailure(exit) ? Cause.pretty(exit.cause) : undefined;
      if (failureCause) {
        log.warn('sub-agent failed', { taskId: id, title, cause: failureCause });
      }

      const text = Exit.isSuccess(exit)
        ? `The sub-agent completed "${title}".${artifactRefs.length === 0 ? ` ${formatResult(exit.value)}` : ''}`
        : `The sub-agent failed to complete "${title}": ${failureCause ?? 'unknown error'}`;

      // Embed each produced artifact as a `reference` block — the chat renders these as a dx-anchor
      // tag with an inline object preview, rather than a raw `echo://` URI in the text.
      const blocks = [
        { _tag: 'text' as const, text },
        ...artifactRefs.map((reference) => ({ _tag: 'reference' as const, reference })),
      ];

      yield* Feed.append(feed, [Message.make({ sender: 'assistant', blocks })]);
    }),
});
