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

/**
 * Hands work to another agent: a new session filed under `agent`, which runs on that agent's own skills and
 * instructions, with the request's task on its checklist.
 */
export const prepareAgentDelegation = (
  agent: Agent.Agent,
  request: Agent.DelegateRequest,
): Effect.Effect<DelegationPlan, never, Database.Service> =>
  Effect.gen(function* () {
    const feed = yield* Database.add(TrajectoryStore.makeFeed());
    const receiver = yield* Database.add(
      Agent.makeSession({
        feed: Ref.make(feed),
        ...(request.purpose !== undefined ? { name: request.purpose } : {}),
        [Obj.Parent]: agent,
      }),
    );
    return yield* assign(receiver, request);
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
    const prompt: ContentBlock.Any[] = request.message
      ? [...request.message]
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
