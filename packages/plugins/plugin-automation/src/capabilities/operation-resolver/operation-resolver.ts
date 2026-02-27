//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { LayoutOperation } from '@dxos/app-toolkit';
import { Obj, Ref } from '@dxos/echo';
import { Function, Script, Trigger } from '@dxos/functions';
import { type DXN } from '@dxos/keys';
import { Operation, OperationResolver } from '@dxos/operation';
import { ATTENDABLE_PATH_SEPARATOR } from '@dxos/plugin-deck/types';
import { SpaceOperation } from '@dxos/plugin-space/types';
import { Filter } from '@dxos/react-client/echo';

import { AutomationOperation } from '../../types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(Capabilities.OperationResolver, [
      OperationResolver.make({
        operation: AutomationOperation.CreateTriggerFromTemplate,
        handler: Effect.fnUntraced(function* ({ db, template, enabled = false, scriptName, input }) {
          const trigger = Trigger.make({ enabled, input });

          // TODO(wittjosiah): Factor out function lookup by script name?
          if (scriptName) {
            const scripts = yield* Effect.promise(() =>
              db.query(Filter.type(Script.Script, { name: scriptName })).run(),
            );
            const [script] = scripts;
            if (script) {
              const functions = yield* Effect.promise(() =>
                db.query(Filter.type(Function.Function, { source: Ref.make(script) })).run(),
              );
              const [fn] = functions;
              if (fn) {
                Obj.change(trigger, (t) => {
                  t.function = Ref.make(fn);
                });
              }
            }
          }

          switch (template.type) {
            case 'timer': {
              Obj.change(trigger, (t) => {
                t.spec = { kind: 'timer', cron: template.cron };
              });
              break;
            }
            case 'queue': {
              Obj.change(trigger, (t) => {
                t.spec = {
                  kind: 'queue',
                  queue: (template.queueDXN as DXN).toString(),
                };
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
            subject: [`automation-settings${ATTENDABLE_PATH_SEPARATOR}${db.spaceId}`],
            workspace: db.spaceId,
          });
        }),
      }),
    ]);
  }),
);
