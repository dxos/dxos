//
// Copyright 2025 DXOS.org
//

import {
  Capabilities,
  Capability,
  LayoutAction,
  createIntent,
  createResolver,
} from '@dxos/app-framework';
import { Ref } from '@dxos/echo';
import { Function, Script, Trigger } from '@dxos/functions';
import { type DXN } from '@dxos/keys';
import { ATTENDABLE_PATH_SEPARATOR } from '@dxos/plugin-deck/types';
import { SpaceAction } from '@dxos/plugin-space/types';
import { Filter } from '@dxos/react-client/echo';

import { AutomationAction } from '../types';

export default Capability.makeModule((context) =>
  Capability.contributes(Capabilities.IntentResolver, [
    createResolver({
      intent: AutomationAction.CreateTriggerFromTemplate,
      resolve: async ({ db, template, enabled = false, scriptName, input }) => {
        const trigger = Trigger.make({ enabled, input });

        // TODO(wittjosiah): Factor out function lookup by script name?
        if (scriptName) {
          const scripts = await db.query(Filter.type(Script.Script, { name: scriptName })).run();
          const [script] = scripts;
          if (script) {
            const functions = await db.query(Filter.type(Function.Function, { source: Ref.make(script) })).run();
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

        return {
          intents: [
            createIntent(SpaceAction.AddObject, {
              object: trigger,
              target: db,
              hidden: true,
            }),
            createIntent(LayoutAction.Open, {
              part: 'main',
              subject: [`automation-settings${ATTENDABLE_PATH_SEPARATOR}${db.spaceId}`],
              options: {
                workspace: db.spaceId,
              },
            }),
          ],
        };
      },
    }),
  ]),
);
