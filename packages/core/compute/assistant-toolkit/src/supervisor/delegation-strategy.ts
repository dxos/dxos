//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';

import { AiContext } from '@dxos/assistant';
import { Instructions } from '@dxos/compute';
import { ProcessManager } from '@dxos/compute-runtime';
import { Database, Feed, Filter, Obj, Ref } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { type Delegation, type DelegationStrategy } from '@dxos/functions-runtime';
import { log } from '@dxos/log';
import { Message } from '@dxos/types';
import { trim } from '@dxos/util';

import { DelegationBlueprint } from '../blueprints';
import { RunInstructions } from '../functions';
import { Agent } from '../types';

/**
 * Resolves the agent whose chat is backed by the given conversation feed, if any. Plain (agentless)
 * chats yield `undefined`, so the strategy is a no-op for them.
 */
const findAgentForFeed = (feed: Feed.Feed): Effect.Effect<Agent.Agent | undefined, never, Database.Service> =>
  Effect.gen(function* () {
    const agents = yield* Database.query(Filter.type(Agent.Agent)).run;
    for (const agent of agents) {
      if (!agent.chat) {
        continue;
      }
      const matches = yield* Effect.gen(function* () {
        const chat = yield* Database.load(agent.chat!);
        const chatFeed = yield* Database.load(chat.feed);
        return chatFeed.id === feed.id;
      }).pipe(Effect.orElseSucceed(() => false));
      if (matches) {
        return agent;
      }
    }
    return undefined;
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
 * Supervisor behaviour for the conversational agent: after each turn, every in-progress plan task
 * not already delegated is run by a sub-agent (a synthesized minimal `Routine` executed via
 * `RunInstructions`); on completion the task status is updated and a templated message is posted back to
 * the conversation.
 */
export const makeDelegationStrategy = (): DelegationStrategy => ({
  reconcile: (feed, activeIds) =>
    Effect.gen(function* () {
      const agent = yield* findAgentForFeed(feed);
      if (!agent) {
        return [];
      }
      const plan = yield* Database.load(agent.plan).pipe(Effect.orElseSucceed(() => undefined));
      if (!plan) {
        return [];
      }

      // Only delegated tasks are spawned as sub-agents — a task created via ordinary planning
      // (`update-tasks`) stays in the plan but is not double-delegated.
      const pending = plan.tasks.filter(
        (task) => task.delegated === true && task.status === 'in-progress' && !activeIds.has(task.id),
      );
      if (pending.length === 0) {
        return [];
      }

      // Sub-agents inherit the supervisor's bound blueprints (so they have the same tools/
      // capabilities), minus the delegation blueprint itself — otherwise a sub-agent could
      // recursively delegate. Resolved from the conversation's AiContext bindings.
      const inheritedBlueprints = yield* Effect.gen(function* () {
        const runtime = yield* Effect.runtime<Database.Service>();
        const binder = yield* EffectEx.acquireReleaseResource(() => new AiContext.Binder({ feed, runtime }));
        return binder.getBlueprints().filter((blueprint) => Obj.getMeta(blueprint).key !== DelegationBlueprint.key);
      }).pipe(Effect.scoped);
      const blueprints = inheritedBlueprints.map((blueprint) => Ref.make(blueprint));

      const delegations: Delegation[] = [];
      for (const task of pending) {
        // Synthesize a minimal instructions whose goal is the task; the sub-agent runs it via RunInstructions
        // with the inherited blueprints bound.
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
            blueprints,
          }),
        );

        delegations.push({
          id: task.id,
          spawn: Effect.gen(function* () {
            const invoker = yield* ProcessManager.ProcessOperationInvoker.Service;
            const fiber = yield* invoker.invokeFiber(RunInstructions, {
              instructions: Ref.make(instructions),
              input: {},
            });
            const pid = fiber.pid;
            Obj.update(plan, (plan) => {
              const taskRecord = plan.tasks.find((taskRecord) => taskRecord.id === task.id);
              if (taskRecord) {
                taskRecord.agentPid = pid;
              }
            });
            return pid;
          }),
        });
      }
      return delegations;
    }),

  onComplete: (feed, id, exit) =>
    Effect.gen(function* () {
      const agent = yield* findAgentForFeed(feed);
      const plan = agent ? yield* Database.load(agent.plan).pipe(Effect.orElseSucceed(() => undefined)) : undefined;

      let title = id;
      if (plan) {
        Obj.update(plan, (plan) => {
          const task = plan.tasks.find((task) => task.id === id);
          if (task) {
            task.status = Exit.isSuccess(exit) ? 'done' : 'failed';
            title = task.title;
          }
        });
      }

      // Fold any artifacts the sub-agent produced into the supervisor agent's context, so follow-up
      // turns can reference them. The sub-agent runs in its own session but in the same space, so
      // the artifacts resolve by id. Keep the stored refs to embed as inline reference blocks below.
      const artifactRefs: Ref.Ref<Obj.Unknown>[] = [];
      if (agent && Exit.isSuccess(exit)) {
        for (const artifactId of extractArtifactIds(exit.value)) {
          const ref = yield* Agent.addArtifact(agent, { name: title, id: artifactId }).pipe(
            Effect.orElseSucceed(() => undefined),
          );
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
