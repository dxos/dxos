//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common, OperationResolver } from '@dxos/app-framework';
import { Ref } from '@dxos/echo';
import { Function, Script, Trigger } from '@dxos/functions';
import { type DXN } from '@dxos/keys';
import { ATTENDABLE_PATH_SEPARATOR } from '@dxos/plugin-deck/types';
import { SpaceOperation } from '@dxos/plugin-space/types';
import { Filter } from '@dxos/react-client/echo';

import { AutomationOperation } from '../../types';

export default Capability.makeModule((context) =>
  Effect.succeed(
    Capability.contributes(Common.Capability.OperationHandler, [
      OperationResolver.make({
        operation: AutomationOperation.CreateTriggerFromTemplate,
        handler: ({ db, template, enabled = false, scriptName, input }) =>
          Effect.gen(function* () {
            const { invoke } = context.getCapability(Common.Capability.OperationInvoker);
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
                  trigger.function = Ref.make(fn);
                }
              }
            }

            switch (template.type) {
              case 'timer': {
                trigger.spec = { kind: 'timer', cron: template.cron };
                break;
              }
              case 'queue': {
                trigger.spec = {
                  kind: 'queue',
                  queue: (template.queueDXN as DXN).toString(),
                };
                break;
              }
              default: {
                break;
              }
            }

            yield* invoke(SpaceOperation.AddObject, {
              object: trigger,
              target: db,
              hidden: true,
            });
            yield* invoke(Common.LayoutOperation.Open, {
              subject: [`automation-settings${ATTENDABLE_PATH_SEPARATOR}${db.spaceId}`],
              workspace: db.spaceId,
            });
          }),
      }),
    ]),
  ),
);

