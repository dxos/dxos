//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Operation, Routine, Trigger } from '@dxos/compute';
import { Database, Feed, Filter, Obj, Ref, Type } from '@dxos/echo';
import { FeedAnnotation } from '@dxos/schema';

import { Agent, AgentChat } from '../../../types';
import { SyncAutomation } from './definitions';

export default SyncAutomation.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ agent: agentRef, subscriptions, cron, qualify }) {
      const agent = yield* Database.load(agentRef);
      yield* syncAgentAutomation(agent, { subscriptions, cron, qualify: qualify ?? true });
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

/** Reads a feed-annotated object's `feed` ref without assuming its schema shape. */
const getFeedRef = (obj: Obj.Unknown): Ref.Ref<Obj.Unknown> | undefined => {
  if (!('feed' in obj)) {
    return undefined;
  }
  const candidate = obj.feed;
  // The target is type-checked after loading (`Obj.instanceOf(Feed.Feed, …)`), so the ref stays untyped here.
  return Ref.isRef(candidate) ? candidate : undefined;
};

/** Checks if an object's schema has the FeedAnnotation. */
const hasFeedAnnotation = (obj: Obj.Unknown): boolean => {
  const type = Obj.getType(obj);
  if (!type) {
    return false;
  }
  const annotation = FeedAnnotation.get(Type.getSchema(type));
  return Option.isSome(annotation) && annotation.value === true;
};

export type AutomationConfig = {
  /** Omitted (vs empty) leaves existing subscription routines untouched. */
  subscriptions?: readonly Ref.Ref<Obj.Unknown>[];
  /** Omitted leaves an existing schedule routine untouched; empty string removes it. */
  cron?: string;
  /** Run the cheap-model relevance check before forwarding subscription events. */
  qualify: boolean;
};

/** A schedule routine's target key is `timer:<cron>`; subscription keys are the target's URI. */
const isTimerKey = (id: string | undefined): boolean => id?.startsWith('timer:') ?? false;

const targetKeyOf = (entity: Obj.Unknown): string | undefined =>
  Obj.getMeta(entity).keys.find((key) => key.source === AGENT_TRIGGER_TARGET_EXTENSION_KEY)?.id;

/**
 * Compiles the agent's automation config into Routines whose triggers run the Relay: the relay
 * qualifies each event with a cheap model and forwards relevant ones onto the chat's durable
 * session. Re-running deletes and recreates the categories present in the config.
 */
export const syncAgentAutomation = (
  agent: Agent.Agent,
  config: AutomationConfig,
): Effect.Effect<void, never, Database.Service> =>
  Effect.gen(function* () {
    // Resolve the chat before the destructive phase: a transient resolution gap must not wipe
    // existing automation without recreating it.
    const chat = yield* AgentChat.loadChat(agent);
    if (!chat) {
      return;
    }
    const chatRef = Ref.make(chat);

    const triggers = yield* Database.query(
      Filter.foreignKeys(Trigger.Trigger, [{ source: AGENT_TRIGGER_EXTENSION_KEY, id: agent.id }]),
    ).run;
    const routines = yield* Database.query(
      Filter.foreignKeys(Routine.Routine, [{ source: AGENT_TRIGGER_EXTENSION_KEY, id: agent.id }]),
    ).run;

    // Reconcile per category: only the categories present in the config are recreated, so a
    // subscriptions-only update (e.g. a UI toggle) cannot silently drop the schedule routine.
    // Recreation keeps operation, concurrency, and enabled in sync when the config changes.
    const shouldRemove = (entity: Obj.Unknown): boolean => {
      const timer = isTimerKey(targetKeyOf(entity));
      return timer ? config.cron !== undefined : config.subscriptions !== undefined;
    };
    for (const trigger of triggers.filter(shouldRemove)) {
      yield* Database.remove(trigger);
    }
    for (const routine of routines.filter(shouldRemove)) {
      yield* Database.remove(routine);
    }

    const triggersEnabled = agent.enabled ?? true;

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

    for (const subscription of config.subscriptions ?? []) {
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
        const feedRef = getFeedRef(target);
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

      yield* makeRoutine({
        name: `${agent.name ?? 'Agent'} — ${Obj.getLabel(target) ?? 'subscription'}`,
        targetKey: subscription.uri,
        spec: Trigger.specFeed(feedObj),
        input: {
          chat: chatRef,
          event: '{{event}}',
          ...(config.qualify ? {} : { qualify: false }),
        },
        concurrency: config.qualify ? 5 : undefined,
      });
    }

    // Timer wake: a synthetic prompt through the same relay path (no event, so no qualification).
    if (config.cron) {
      yield* makeRoutine({
        name: `${agent.name ?? 'Agent'} — schedule`,
        targetKey: `timer:${config.cron}`,
        spec: Trigger.specTimer(config.cron),
        input: {
          chat: chatRef,
          prompt: 'Scheduled wake: continue your instructions and review outstanding work.',
        },
      });
    }

    yield* Database.flush();
  });
