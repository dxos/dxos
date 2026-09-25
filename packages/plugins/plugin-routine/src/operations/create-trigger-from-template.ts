//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import * as Script from '@dxos/compute/Script';
import * as Trigger from '@dxos/compute/Trigger';
import { type Feed, Filter, Obj, Ref } from '@dxos/echo';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';

import { RoutineOperation } from '#types';

import { getRoutinesSettingsPath } from '../paths.ts';

const handler: Operation.WithHandler<typeof RoutineOperation.CreateTriggerFromTemplate> =
  RoutineOperation.CreateTriggerFromTemplate.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ db, template, enabled = false, scriptName, input }) {
        const trigger = Trigger.make({ enabled, input });

        // TODO(wittjosiah): Factor out operation lookup by script name?
        if (scriptName) {
          const scripts = yield* Effect.promise(() => db.query(Filter.type(Script.Script, { name: scriptName })).run());
          const [script] = scripts;
          if (script) {
            const operations = yield* Effect.promise(() =>
              db.query(Filter.type(Operation.PersistentOperation, { source: Ref.make(script) })).run(),
            );
            const [operation] = operations;
            if (operation) {
              Obj.update(trigger, (trigger) => {
                trigger.runnable = Ref.make(operation);
              });
            }
          }
        }

        switch (template.type) {
          case 'timer': {
            Obj.update(trigger, (trigger) => {
              trigger.spec = Trigger.specTimer(template.cron);
            });
            break;
          }
          case 'feed': {
            Obj.update(trigger, (trigger) => {
              trigger.spec = Trigger.specFeed(template.feed as Feed.Feed);
            });
            break;
          }
          default: {
            break;
          }
        }

        yield* Operation.invoke(SpaceOperation.AddObject, { object: trigger }, { spaceId: db.spaceId });
        yield* Operation.invoke(LayoutOperation.Open, {
          subject: [getRoutinesSettingsPath(db.spaceId)],
          workspace: GraphPath.getSpacePath(db.spaceId),
        });
      }),
    ),
  );

export default handler;
