//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Database, Feed, Filter, Obj, Ref } from '@dxos/echo';
import { FunctionDefinition, Trigger } from '@dxos/functions';
import { FeedAnnotation } from '@dxos/schema';

import { Project } from '../../types';

import { ProjectFunctions } from './functions';

/**
 * Foreign key {@link PROJECT_TRIGGER_EXTENSION_KEY} => <project id : ObjectId>.
 */
const PROJECT_TRIGGER_EXTENSION_KEY = 'org.dxos.extension.ProjectTrigger';

/**
 * Foreign key {@link PROJECT_TRIGGER_TARGET_EXTENSION_KEY} => <dxn string of subscription target>.
 */
const PROJECT_TRIGGER_TARGET_EXTENSION_KEY = 'org.dxos.extension.ProjectTriggerTarget';

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
 * Syncs triggers in the database with the project subscriptions.
 *
 * @param project - The project whose triggers should be synced.
 * @returns An Effect that syncs triggers.
 */
export const syncProjectTriggers = (project: Project.Project): Effect.Effect<void, never, Database.Service> =>
  Effect.gen(function* () {
    const triggers = yield* Database.runQuery(
      Filter.foreignKeys(Trigger.Trigger, [{ source: PROJECT_TRIGGER_EXTENSION_KEY, id: project.id }]),
    );

    for (const trigger of triggers) {
      const target = Obj.getKeys(trigger, PROJECT_TRIGGER_TARGET_EXTENSION_KEY).at(0)?.id;

      const exists = project.subscriptions.find((subscription) => subscription.dxn.toString() === target);
      if (!exists && !(project.useQualifyingAgent && target === Obj.getDXN(project)?.toString())) {
        yield* Database.remove(trigger);
      }
    }

    for (const subscription of project.subscriptions) {
      const relevantTrigger = triggers.find((trigger) =>
        Obj.getKeys(trigger, PROJECT_TRIGGER_TARGET_EXTENSION_KEY).some(
          (key) => key.id === subscription.dxn.toString(),
        ),
      );
      if (relevantTrigger) {
        continue;
      }

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
          function: Ref.make(
            FunctionDefinition.serialize(
              project.useQualifyingAgent ? ProjectFunctions.Qualifier : ProjectFunctions.Agent,
            ),
          ),
          input: {
            project: Ref.make(project),
            event: '{{event}}',
          },
          concurrency: project.useQualifyingAgent ? 5 : undefined,
        }),
      );
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
                {
                  source: PROJECT_TRIGGER_TARGET_EXTENSION_KEY,
                  id: Obj.getDXN(project)?.toString() ?? '',
                },
              ],
            },
            function: Ref.make(FunctionDefinition.serialize(ProjectFunctions.Agent)),
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

    yield* Database.flush();
  });
