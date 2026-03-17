//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { Database, Feed, Filter, Obj, Ref } from '@dxos/echo';
import type { DXN } from '@dxos/keys';
import { defineFunction, FunctionDefinition, Trigger } from '@dxos/functions';
import { FeedAnnotation } from '@dxos/schema';
import { default as Agent } from './agent';
import { default as Qualifier } from './qualifier';
import { Prompt } from '@dxos/blueprints';

import { Project } from '../../../types';
import { processEvent, ProjectPrompts } from '../prompts';
import { AgentFunctions } from '../../../functions';

// TODO(dmaretskyi): Perhaps the association is better done with a relation.

/**
 * Foreign key {@link PROJECT_TRIGGER_EXTENSION_KEY} => <initative id : ObjectId>
 */
const PROJECT_TRIGGER_EXTENSION_KEY = 'dxos.org/extension/ProjectTrigger';

/**
 * Foreign key {@link PROJECT_TRIGGER_TARGET_EXTENSION_KEY} => <dxn string of subscription target>
 */
const PROJECT_TRIGGER_TARGET_EXTENSION_KEY = 'dxos.org/extension/ProjectTriggerTarget';

/** Checks if an object's schema has the FeedAnnotation (e.g. Mailbox, Calendar). */
const hasFeedAnnotation = (obj: Obj.Unknown): boolean => {
  const schema = Obj.getSchema(obj);
  if (!schema) {
    return false;
  }
  const annotation = FeedAnnotation.get(schema);
  return Option.isSome(annotation) && annotation.value === true;
};

/** Resolves queue DXN from a subscription target (Feed, or object with FeedAnnotation). */
const resolveQueueDxn = (
  target: Obj.Unknown,
): Effect.Effect<DXN | undefined, never, never> =>
  Effect.gen(function* () {
    let feedObj: Feed.Feed | undefined;
    if (Obj.instanceOf(Feed.Feed, target)) {
      feedObj = target;
    } else if (hasFeedAnnotation(target)) {
      const feedRef = (target as { feed?: Ref.Ref<Feed.Feed> }).feed;
      feedObj = feedRef ? yield* Effect.promise(() => feedRef.tryLoad()) : undefined;
    }
    return Option.fromNullable(feedObj).pipe(
      Option.filter(Obj.instanceOf(Feed.Feed)),
      Option.flatMap((feed) => Option.fromNullable(Feed.getQueueDxn(feed))),
      Option.getOrUndefined,
    );
  });

export default defineFunction({
  key: 'dxos.org/function/project/sync-triggers',
  name: 'Sync Project Triggers',
  description: 'Syncs triggers in the database with the project subscriptions.',
  inputSchema: Schema.Struct({
    project: Schema.suspend(() => Ref.Ref(Project.Project)),
  }),
  outputSchema: Schema.Void,
  services: [Database.Service],
  handler: Effect.fnUntraced(function* ({ data }) {
    const project = yield* Database.load(data.project);
    const prompt = yield* getPrompt();

    const triggers = yield* Database.runQuery(
      Filter.foreignKeys(Trigger.Trigger, [{ source: PROJECT_TRIGGER_EXTENSION_KEY, id: project.id }]),
    );

    // Delete triggers that are not in subscriptions.
    for (const trigger of triggers) {
      const target = Obj.getKeys(trigger, PROJECT_TRIGGER_TARGET_EXTENSION_KEY).at(0)?.id;

      const exists = project.subscriptions.find((subscription) => subscription.dxn.toString() === target);
      if (!exists && !(project.useQualifyingAgent && target === Obj.getDXN(project)?.toString())) {
        yield* Database.remove(trigger);
      }
    }

    // Add triggers that are not in the database.
    for (const subscription of project.subscriptions) {
      const relevantTrigger = triggers.find((trigger) =>
        Obj.getKeys(trigger, PROJECT_TRIGGER_TARGET_EXTENSION_KEY).some(
          (key) => key.id === subscription.dxn.toString(),
        ),
      );
      if (relevantTrigger) {
        continue;
      }

      const target = yield* Effect.promise(() => subscription.tryLoad());
      if (!target) {
        continue;
      }

      const queueDxn = yield* resolveQueueDxn(target);
      if (!queueDxn) {
        continue;
      }

      if (project.useQualifyingAgent) {
        yield* Database.add(
          Trigger.make({
            [Obj.Parent]: project,
            [Obj.Meta]: {
              keys: [
                // TODO(dmaretskyi): Query by relation instead of manually adding keys.
                { source: PROJECT_TRIGGER_EXTENSION_KEY, id: project.id },
                { source: PROJECT_TRIGGER_TARGET_EXTENSION_KEY, id: subscription.dxn.toString() },
              ],
            },
            enabled: true,
            spec: {
              kind: 'queue',
              queue: queueDxn.toString(),
            },
            function: Ref.make(FunctionDefinition.serialize(Qualifier)),
            input: {
              project: Ref.make(project),
              event: '{{event}}',
            },
            concurrency: project.useQualifyingAgent ? 5 : undefined,
          }),
        );
      } else {
        yield* Database.add(
          Trigger.make({
            [Obj.Parent]: project,
            [Obj.Meta]: {
              keys: [
                { source: PROJECT_TRIGGER_EXTENSION_KEY, id: project.id },
                { source: PROJECT_TRIGGER_TARGET_EXTENSION_KEY, id: subscription.dxn.toString() },
              ],
            },
            enabled: true,
            spec: {
              kind: 'queue',
              queue: queueDxn.toString(),
            },
            function: Ref.make(FunctionDefinition.serialize(AgentFunctions.Prompt)),
            input: {
              prompt: Ref.make(prompt),
              input: '{{event}}',
            },
          }),
        );
      }
    }

    if (project.useQualifyingAgent) {
      const qualifierTrigger = triggers.find((trigger) =>
        Obj.getKeys(trigger, PROJECT_TRIGGER_TARGET_EXTENSION_KEY).some(
          (key) => key.id === Obj.getDXN(project)?.toString(),
        ),
      );
      if (!qualifierTrigger && project.queue) {
        yield* Database.add(
          Trigger.make({
            [Obj.Parent]: project,
            [Obj.Meta]: {
              keys: [
                { source: PROJECT_TRIGGER_EXTENSION_KEY, id: project.id },
                { source: PROJECT_TRIGGER_TARGET_EXTENSION_KEY, id: Obj.getDXN(project)?.toString() ?? '' },
              ],
            },
            function: Ref.make(FunctionDefinition.serialize(Agent)),
            enabled: true,
            spec: {
              kind: 'queue',
              queue: project.queue.dxn.toString(),
            },
            input: {
              project: Ref.make(project),
              event: '{{event}}',
            },
          }),
        );
      }
    }

    yield* Database.flush({ indexes: true });
  }),
});

const getPrompt = Effect.fnUntraced(function* () {
  const prompt = yield* Database.runQuery(Filter.type(Prompt.Prompt, { key: processEvent.key }));
  if (prompt.length > 0) {
    return prompt[0];
  }

  return yield* Database.add(Obj.clone(processEvent));
});
