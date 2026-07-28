//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Operation, Routine, Trigger } from '@dxos/compute';
import { Database, Feed, Filter, Obj, Ref, Type } from '@dxos/echo';
import { FeedAnnotation } from '@dxos/schema';

import { Agent } from '../../../types';
import { SyncTriggers } from './definitions';

export default SyncTriggers.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ agent: agentRef }) {
      const agent = yield* Database.load(agentRef);
      yield* syncAgentTriggers(agent);
    }),
  ),
);

/**
 * Foreign key {@link AGENT_TRIGGER_EXTENSION_KEY} => <agent id : EntityId>.
 */
const AGENT_TRIGGER_EXTENSION_KEY = 'org.dxos.extension.AgentTrigger';

/**
 * Foreign key {@link AGENT_TRIGGER_TARGET_EXTENSION_KEY} => <dxn string of subscription target>.
 */
const AGENT_TRIGGER_TARGET_EXTENSION_KEY = 'org.dxos.extension.AgentTriggerTarget';

/** Checks if an object's schema has the FeedAnnotation. */
const hasFeedAnnotation = (obj: Obj.Unknown): boolean => {
  const type = Obj.getType(obj);
  if (!type) {
    return false;
  }
  const annotation = FeedAnnotation.get(Type.getSchema(type));
  return Option.isSome(annotation) && annotation.value === true;
};

/**
 * Compiles the agent's `subscriptions`/`cron` fields into Routines whose triggers run the Relay
 * (plugin-projects PLAN.md phase C): the relay qualifies each event with a cheap model and forwards
 * relevant ones onto the chat's durable session — the two-stage qualifier pipeline through
 * `agent.feed` is gone. Re-running deletes and recreates everything (including any pre-relay
 * triggers, which migrates legacy agents on their next sync).
 */
const syncAgentTriggers = (agent: Agent.Agent): Effect.Effect<void, never, Database.Service> =>
  Effect.gen(function* () {
    const triggers = yield* Database.query(
      Filter.foreignKeys(Trigger.Trigger, [{ source: AGENT_TRIGGER_EXTENSION_KEY, id: agent.id }]),
    ).run;
    const routines = yield* Database.query(
      Filter.foreignKeys(Routine.Routine, [{ source: AGENT_TRIGGER_EXTENSION_KEY, id: agent.id }]),
    ).run;

    // Remove all existing triggers/routines — they will be recreated with the current config.
    // This ensures operation, concurrency, and enabled stay in sync when agent fields change.
    for (const trigger of triggers) {
      yield* Database.remove(trigger);
    }
    for (const routine of routines) {
      yield* Database.remove(routine);
    }

    const triggersEnabled = agent.enabled ?? true;
    const chatRef = agent.chat;
    if (!chatRef) {
      // Without a chat there is no session to relay into; nothing to compile.
      yield* Database.flush();
      return;
    }

    // Lazy import to avoid circular dependency issues.
    const { Relay } = yield* Effect.promise(() => import('../../agent/operations/definitions'));

    const makeRoutine = (options: {
      name: string;
      targetKey: string;
      spec: Trigger.Trigger['spec'];
      input: Record<string, unknown>;
      concurrency?: number;
    }): Effect.Effect<void, never, Database.Service> =>
      Effect.gen(function* () {
        const keys = [
          { source: AGENT_TRIGGER_EXTENSION_KEY, id: agent.id },
          { source: AGENT_TRIGGER_TARGET_EXTENSION_KEY, id: options.targetKey },
        ];
        const runnable = yield* Database.add(Operation.serialize(Relay));
        const trigger = yield* Database.add(
          Trigger.make({
            [Obj.Parent]: agent,
            [Obj.Meta]: { keys },
            enabled: triggersEnabled,
            spec: options.spec,
            runnable: Ref.make(runnable),
            input: options.input,
            ...(options.concurrency !== undefined ? { concurrency: options.concurrency } : {}),
          }),
        );
        // The Routine is the user-facing aggregate (action + trigger), shared with projects.
        yield* Database.add(
          Obj.make(Routine.Routine, {
            [Obj.Parent]: agent,
            [Obj.Meta]: { keys },
            name: options.name,
            spec: { kind: 'runnable', runnable: Ref.make(runnable) },
            triggers: [Ref.make(trigger)],
          }),
        );
      });

    for (const subscription of agent.subscriptions) {
      const targetOption = yield* Database.load(subscription).pipe(
        Effect.map(Option.some),
        Effect.catchTag('EntityNotFoundError', () => Effect.succeed(Option.none())),
      );
      if (Option.isNone(targetOption)) {
        continue;
      }
      const target = targetOption.value;

      let feedObj: Feed.Feed | undefined;
      if (Obj.instanceOf(Feed.Feed, target)) {
        feedObj = target;
      } else if (hasFeedAnnotation(target)) {
        const feedRef = (target as Obj.Unknown & { feed?: Ref.Ref<Feed.Feed> }).feed;
        feedObj = feedRef
          ? Option.getOrUndefined(
              yield* Database.load(feedRef).pipe(
                Effect.map(Option.some),
                Effect.catchTag('EntityNotFoundError', () => Effect.succeed(Option.none())),
              ),
            )
          : undefined;
      }

      if (!feedObj || !Obj.instanceOf(Feed.Feed, feedObj) || !Feed.getFeedUri(feedObj)) {
        continue;
      }

      // `filterEvents` maps to the relay's qualify switch (false = deliver unfiltered).
      const qualify = agent.filterEvents ?? true;
      yield* makeRoutine({
        name: `${agent.name ?? 'Agent'} — ${Obj.getLabel(target) ?? 'subscription'}`,
        targetKey: subscription.uri,
        spec: Trigger.specFeed(feedObj),
        input: {
          chat: chatRef,
          event: '{{event}}',
          ...(qualify ? {} : { qualify: false }),
        },
        concurrency: qualify ? 5 : undefined,
      });
    }

    // Timer wake: a synthetic prompt through the same relay path (no event, so no qualification).
    if (agent.cron) {
      yield* makeRoutine({
        name: `${agent.name ?? 'Agent'} — schedule`,
        targetKey: `timer:${agent.cron}`,
        spec: Trigger.specTimer(agent.cron),
        input: {
          chat: chatRef,
          prompt: 'Scheduled wake: continue your instructions and review outstanding work.',
        },
      });
    }

    yield* Database.flush();
  });
