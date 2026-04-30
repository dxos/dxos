//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Database, Feed, Filter, Obj, Ref } from '@dxos/echo';
import { Trigger } from '@dxos/functions';
import { Operation } from '@dxos/operation';
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
 * Foreign key {@link AGENT_TRIGGER_EXTENSION_KEY} => <agent id : ObjectId>.
 */
const AGENT_TRIGGER_EXTENSION_KEY = 'org.dxos.extension.AgentTrigger';

/**
 * Foreign key {@link AGENT_TRIGGER_TARGET_EXTENSION_KEY} => <dxn string of subscription target>.
 */
const AGENT_TRIGGER_TARGET_EXTENSION_KEY = 'org.dxos.extension.AgentTriggerTarget';

/** Checks if an object's schema has the FeedAnnotation. */
const hasFeedAnnotation = (obj: Obj.Unknown): boolean => {
  const schema = Obj.getSchema(obj);
  if (!schema) {
    return false;
  }
  const annotation = FeedAnnotation.get(schema);
  return Option.isSome(annotation) && annotation.value === true;
};

/**
 * Syncs triggers in the database with the agent subscriptions.
 */
const syncAgentTriggers = (agent: Agent.Agent): Effect.Effect<void, never, Database.Service> =>
  Effect.gen(function* () {
    const triggers = yield* Database.runQuery(
      Filter.foreignKeys(Trigger.Trigger, [{ source: AGENT_TRIGGER_EXTENSION_KEY, id: agent.id }]),
    );

    // Remove all existing triggers — they will be recreated with the current config.
    // This ensures operation and concurrency stay in sync when filterEvents is toggled.
    for (const trigger of triggers) {
      yield* Database.remove(trigger);
    }

    // Lazy import to avoid circular dependency issues.
    const { Qualifier, AgentWorker } = yield* Effect.promise(() => import('../../project'));

    for (const subscription of agent.subscriptions) {
      const targetOption = yield* Database.loadOption(subscription);
      if (Option.isNone(targetOption)) {
        continue;
      }
      const target = targetOption.value;

      let feedObj: Feed.Feed | undefined;
      if (Obj.instanceOf(Feed.Feed, target)) {
        feedObj = target;
      } else if (hasFeedAnnotation(target)) {
        const feedRef = (target as Obj.Unknown & { feed?: Ref.Ref<Feed.Feed> }).feed;
        feedObj = feedRef ? Option.getOrUndefined(yield* Database.loadOption(feedRef)) : undefined;
      }

      const queueDxn = Option.fromNullable(feedObj).pipe(
        Option.filter(Obj.instanceOf(Feed.Feed)),
        Option.map(Feed.getQueueDxn),
        Option.getOrUndefined,
      );
      if (!queueDxn) {
        continue;
      }

      const filterEvents = agent.filterEvents ?? true;

      yield* Database.add(
        Trigger.make({
          [Obj.Parent]: agent,
          [Obj.Meta]: {
            keys: [
              { source: AGENT_TRIGGER_EXTENSION_KEY, id: agent.id },
              { source: AGENT_TRIGGER_TARGET_EXTENSION_KEY, id: subscription.dxn.toString() },
            ],
          },
          enabled: true,
          spec: Trigger.specQueue(queueDxn.toString()),
          function: Ref.make(Operation.serialize(filterEvents ? Qualifier : AgentWorker)),
          input: {
            agent: Ref.make(agent),
            event: '{{event}}',
          },
          concurrency: filterEvents ? 5 : undefined,
        }),
      );
    }

    if ((agent.filterEvents ?? true) && agent.queue) {
      yield* Database.add(
        Trigger.make({
          [Obj.Parent]: agent,
          [Obj.Meta]: {
            keys: [
              { source: AGENT_TRIGGER_EXTENSION_KEY, id: agent.id },
              {
                source: AGENT_TRIGGER_TARGET_EXTENSION_KEY,
                id: Obj.getDXN(agent)?.toString() ?? '',
              },
            ],
          },
          function: Ref.make(Operation.serialize(AgentWorker)),
          enabled: true,
          spec: Trigger.specQueue(agent.queue.dxn.toString()),
          input: {
            agent: Ref.make(agent),
            event: '{{event}}',
          },
        }),
      );
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
          enabled: true,
          spec: Trigger.specTimer(agent.cron),
          function: Ref.make(Operation.serialize(AgentWorker)),
          input: {
            agent: Ref.make(agent),
            event: '{{event}}',
          },
        }),
      );
    }

    yield* Database.flush();
  });
