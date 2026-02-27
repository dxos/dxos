//
// Copyright 2025 DXOS.org
//

import * as Option from 'effect/Option';

import { type Project, ProjectFunctions } from '@dxos/assistant-toolkit';
import { Feed, Obj, Ref, Type } from '@dxos/echo';
import { FunctionDefinition, Trigger } from '@dxos/functions';
import { Filter } from '@dxos/react-client/echo';

// TODO(dmaretskyi): Perhaps the association is better done with a relation.

/**
 * Foreign key {@link PROJECT_TRIGGER_EXTENSION_KEY} => <initative id : ObjectId>
 */
const PROJECT_TRIGGER_EXTENSION_KEY = 'dxos.org/extension/ProjectTrigger';

/**
 * Foreign key {@link PROJECT_TRIGGER_EXTENSION_KEY} => <dxn string of subscription target>
 */
const PROJECT_TRIGGER_TARGET_EXTENSION_KEY = 'dxos.org/extension/ProjectTriggerTarget';

/**
 * Syncs triggers in the database with the project subscriptions.
 */
export const syncTriggers = async (project: Project.Project) => {
  const db = Obj.getDatabase(project);
  if (!db) {
    return;
  }

  const triggers = await db
    .query(Filter.foreignKeys(Trigger.Trigger, [{ source: PROJECT_TRIGGER_EXTENSION_KEY, id: project.id }]))
    .run();

  // Delete triggers that are not in subscriptions.
  for (const trigger of triggers) {
    const target = Obj.getKeys(trigger, PROJECT_TRIGGER_TARGET_EXTENSION_KEY).at(0)?.id;

    const exists = project.subscriptions.find((subscription) => subscription.dxn.toString() === target);
    if (!exists && !(project.useQualifyingAgent && target === Obj.getDXN(project)?.toString())) {
      db.remove(trigger);
    }
  }

  // Add triggers that are not in the database.
  for (const subscription of project.subscriptions) {
    const relevantTrigger = triggers.find((trigger) =>
      Obj.getKeys(trigger, PROJECT_TRIGGER_TARGET_EXTENSION_KEY).some((key) => key.id === subscription.dxn.toString()),
    );
    if (relevantTrigger) {
      continue;
    }

    const target = await subscription.tryLoad();
    if (!target) {
      continue;
    }

    const queueDxn = Option.some(target).pipe(Option.filter(Obj.instanceOf(Type.Feed)), Option.map(Feed.getQueueDxn));
    if (!queueDxn) {
      continue;
    }

    db.add(
      Trigger.make({
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
      db.add(
        Trigger.make({
          [Obj.Meta]: {
            keys: [
              { source: PROJECT_TRIGGER_EXTENSION_KEY, id: project.id },
              { source: PROJECT_TRIGGER_TARGET_EXTENSION_KEY, id: Obj.getDXN(project)?.toString() ?? '' },
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

  await db.flush({ indexes: true });
};
