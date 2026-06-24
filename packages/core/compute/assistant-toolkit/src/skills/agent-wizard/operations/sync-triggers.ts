//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Trigger, Operation } from '@dxos/compute';
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
 * Syncs triggers in the database with the agent subscriptions.
 */
const syncAgentTriggers = (agent: Agent.Agent): Effect.Effect<void, never, Database.Service> =>
  Effect.gen(function* () {
    const triggers = yield* Database.query(
      Filter.foreignKeys(Trigger.Trigger, [{ source: AGENT_TRIGGER_EXTENSION_KEY, id: agent.id }]),
    ).run;

    // Remove all existing triggers — they will be recreated with the current config.
    // This ensures operation, concurrency, and enabled stay in sync when agent fields change.
    for (const trigger of triggers) {
      yield* Database.remove(trigger);
    }

    const triggersEnabled = agent.enabled ?? true;

    // Lazy import to avoid circular dependency issues.
    const { Qualifier, AgentWorker } = yield* Effect.promise(() => import('../../agent/operations/definitions'));

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

      if (!feedObj || !Obj.instanceOf(Feed.Feed, feedObj) || !Feed.getQueueUri(feedObj)) {
        continue;
      }

      const filterEvents = agent.filterEvents ?? true;

      yield* Database.add(
        Trigger.make({
          [Obj.Parent]: agent,
          [Obj.Meta]: {
            keys: [
              { source: AGENT_TRIGGER_EXTENSION_KEY, id: agent.id },
              { source: AGENT_TRIGGER_TARGET_EXTENSION_KEY, id: subscription.uri },
            ],
          },
          enabled: triggersEnabled,
          spec: Trigger.specFeed(feedObj),
          runnable: Ref.make(Operation.serialize(filterEvents ? Qualifier : AgentWorker)),
          input: {
            agent: Ref.make(agent),
            event: '{{event}}',
          },
          concurrency: filterEvents ? 5 : undefined,
        }),
      );
    }

    if ((agent.filterEvents ?? true) && agent.feed) {
      const agentFeedOption = yield* Database.load(agent.feed).pipe(
        Effect.map(Option.some),
        Effect.catchTag('EntityNotFoundError', () => Effect.succeed(Option.none())),
      );
      if (Option.isSome(agentFeedOption) && Feed.getQueueUri(agentFeedOption.value)) {
        yield* Database.add(
          Trigger.make({
            [Obj.Parent]: agent,
            [Obj.Meta]: {
              keys: [
                { source: AGENT_TRIGGER_EXTENSION_KEY, id: agent.id },
                {
                  source: AGENT_TRIGGER_TARGET_EXTENSION_KEY,
                  id: Obj.getURI(agent) ?? '',
                },
              ],
            },
            runnable: Ref.make(Operation.serialize(AgentWorker)),
            enabled: triggersEnabled,
            spec: Trigger.specFeed(agentFeedOption.value),
            input: {
              agent: Ref.make(agent),
              event: '{{event}}',
            },
          }),
        );
      }
    }

    // Timer trigger bypasses the qualifier and invokes the agent worker directly on a schedule.
    if (agent.cron) {
      yield* Database.add(
        Trigger.make({
          [Obj.Parent]: agent,
          [Obj.Meta]: {
            keys: [
              { source: AGENT_TRIGGER_EXTENSION_KEY, id: agent.id },
              { source: AGENT_TRIGGER_TARGET_EXTENSION_KEY, id: `timer:${agent.cron}` },
            ],
          },
          enabled: triggersEnabled,
          spec: Trigger.specTimer(agent.cron),
          runnable: Ref.make(Operation.serialize(AgentWorker)),
          input: {
            agent: Ref.make(agent),
            event: '{{event}}',
          },
        }),
      );
    }

    yield* Database.flush();
  });
