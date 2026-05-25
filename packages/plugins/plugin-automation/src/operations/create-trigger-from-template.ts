//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { LayoutOperation, getSpacePath } from '@dxos/app-toolkit';
import { Operation, Script, Trigger } from '@dxos/compute';
import { type Feed, Filter, Obj, Ref } from '@dxos/echo';
import { SpaceOperation } from '@dxos/plugin-space';

import { meta } from '#meta';

import { AutomationOperation } from '../types';

const handler: Operation.WithHandler<typeof AutomationOperation.CreateTriggerFromTemplate> =
  AutomationOperation.CreateTriggerFromTemplate.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ db, template, enabled = false, scriptName, input }) {
        const trigger = Trigger.make({ enabled, input });

        // TODO(wittjosiah): Factor out function lookup by script name?
        if (scriptName) {
          const scripts = yield* Effect.promise(() => db.query(Filter.type(Script.Script, { name: scriptName })).run());
          const [script] = scripts;
          if (script) {
            const functions = yield* Effect.promise(() =>
              db.query(Filter.type(Operation.PersistentOperation, { source: Ref.make(script) })).run(),
            );
            const [fn] = functions;
            if (fn) {
              Obj.update(trigger, (trigger) => {
                trigger.function = Ref.make(fn);
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

        yield* Operation.invoke(SpaceOperation.AddObject, {
          object: trigger,
          target: db,
          hidden: true,
        });
        yield* Operation.invoke(LayoutOperation.Open, {
          subject: [`${getSpacePath(db.spaceId)}/settings/${meta.id}.automations`],
          workspace: getSpacePath(db.spaceId),
        });
      }),
    ),
  );

export default handler;
