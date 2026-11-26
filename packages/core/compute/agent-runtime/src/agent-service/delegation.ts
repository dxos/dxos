//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import type * as Scope from 'effect/Scope';

import { AiContext, TrajectoryStore } from '@dxos/assistant';
import * as Agent from '@dxos/compute/Agent';
import * as Skill from '@dxos/compute/Skill';
import { Database, Obj, Ref } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import { type URI } from '@dxos/keys';
import { type ContentBlock, Task } from '@dxos/types';

/** What delegation writes before the receiver's first turn; whoever runs the receiver submits {@link prompt}. */
export type DelegationPlan = {
  readonly receiver: Agent.Session;
  /** The first turn's prompt: the request's message, else a synthetic note naming the task or the purpose. */
  readonly prompt: ContentBlock.Any[];
};

/**
 * Hands work from `caller` to another session of its agent: the session `target` names, or a new one that starts on the
 * caller's skills, context and instructions and is filed under the caller's agent. The request's task goes on the
 * receiver's checklist with the receiver as its delegate.
 */
export const prepareSessionDelegation = (
  caller: Agent.Session,
  request: Agent.DelegateRequest,
  target: URI.URI | undefined,
): Effect.Effect<DelegationPlan, never, Database.Service | Scope.Scope> =>
  Effect.gen(function* () {
    const receiver =
      target !== undefined
        ? yield* Database.resolve(target, Agent.Session).pipe(Effect.orDie)
        : yield* Effect.gen(function* () {
            const runtime = yield* Effect.context<Database.Service>();
            const callerFeed = yield* Database.load(caller.feed).pipe(Effect.orDie);
            const callerContext = yield* EffectEx.acquireReleaseResource(
              () => new AiContext.Binder({ feed: callerFeed, runtime }),
            );
            const feed = yield* Database.add(TrajectoryStore.makeFeed());
            const binder = yield* EffectEx.acquireReleaseResource(() => new AiContext.Binder({ feed, runtime }));
            yield* Effect.promise(() =>
              binder.bind({
                skills: callerContext.getSkills().map(Skill.makeRef),
                objects: callerContext.getObjects().map((object) => Ref.make(object)),
              }),
            );
            // The same agent works the delegated session, so it is filed under that agent when there is one.
            const agent = yield* Agent.loadForSession(caller);
            const session = yield* Database.add(
              Agent.makeSession({
                feed: Ref.make(feed),
                ...(request.purpose !== undefined ? { name: request.purpose } : {}),
                ...(caller.instructions ? { instructions: caller.instructions } : {}),
                ...(agent ? { [Obj.Parent]: agent } : {}),
              }),
            );
            Agent.seedSession(session, caller.session);
            return session;
          });
    return yield* assign(receiver, request);
  });

/** What agent delegation writes: the session plan plus who the receiver's first turn comes from. */
export type AgentDelegationPlan = DelegationPlan & {
  /** The caller's agent, named on the receiver's first turn. */
  readonly sender: Agent.PromptSender;
};

/**
 * Hands work from `caller` to another agent: that agent's primary session takes the message (or the task) as a turn
 * from the caller's agent, and runs on that agent's own skills and permissions, never the caller's. An agent cannot
 * delegate to itself, and one with no session has nothing to take the work.
 */
export const prepareAgentDelegation = (
  caller: Agent.Session,
  agent: Agent.Agent,
  request: Agent.DelegateRequest,
): Effect.Effect<AgentDelegationPlan, never, Database.Service | Scope.Scope> =>
  Effect.gen(function* () {
    const session = yield* Agent.loadSession(agent);
    if (!session) {
      return yield* Effect.die(new Error(`Agent ${agent.name ?? Obj.getURI(agent)} has no session to delegate to.`));
    }
    const callerAgent = yield* Agent.loadForSession(caller);
    if (callerAgent?.id === agent.id) {
      return yield* Effect.die(new Error('An agent cannot delegate to itself; delegate to a session instead.'));
    }
    const plan = yield* prepareSessionDelegation(caller, request, Obj.getURI(session));
    return { ...plan, sender: { name: callerAgent?.name ?? caller.name ?? 'Another agent' } };
  });

/** Puts the request's task on the receiver's checklist and builds its first prompt. */
const assign = (
  receiver: Agent.Session,
  request: Agent.DelegateRequest,
): Effect.Effect<DelegationPlan, never, Database.Service> =>
  Effect.gen(function* () {
    const task = request.task ? yield* Database.load(request.task).pipe(Effect.orDie) : undefined;
    const assigned = task && Obj.instanceOf(Task.Task, task) ? task : undefined;
    if (assigned) {
      Agent.assignTasks(receiver, [Ref.make(assigned)]);
      Task.update(assigned, { status: 'started', delegate: { role: 'assistant', subject: Ref.make(receiver) } });
    }
    yield* Database.flush();
    // Delegated text comes from another session or agent, never the reader, so it shows as context, not their words.
    const prompt: ContentBlock.Any[] = request.message
      ? request.message.map((block) =>
          block._tag === 'text' ? { ...block, disposition: 'synthetic' as const } : block,
        )
      : [
          {
            _tag: 'text',
            // The system writes this on the reader's behalf, so it shows as context rather than as their words.
            disposition: 'synthetic',
            text: assigned
              ? `You have been assigned the task below.\n- ${JSON.stringify(assigned.title)}: ${Obj.getURI(assigned)}`
              : (request.purpose ?? ''),
          },
        ];
    return { receiver, prompt };
  });
