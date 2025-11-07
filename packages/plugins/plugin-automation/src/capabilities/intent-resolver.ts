//
// Copyright 2025 DXOS.org
//

import {
  Capabilities,
  LayoutAction,
  type PluginContext,
  contributes,
  createIntent,
  createResolver,
} from '@dxos/app-framework';
import { Ref } from '@dxos/echo';
import { Function, Script, Trigger } from '@dxos/functions-runtime';
import { type DXN } from '@dxos/keys';
import { ATTENDABLE_PATH_SEPARATOR } from '@dxos/plugin-deck/types';
import { SpaceAction } from '@dxos/plugin-space/types';
import { Filter } from '@dxos/react-client/echo';

import { AutomationAction } from '../types';

export default (context: PluginContext) =>
  contributes(Capabilities.IntentResolver, [
    createResolver({
      intent: AutomationAction.CreateTriggerFromTemplate,
      resolve: async ({ space, template, enabled = false, scriptName, input }) => {
        const trigger = Trigger.make({ enabled, input });

        // TODO(wittjosiah): Factor out function lookup by script name?
        if (scriptName) {
          const {
            objects: [script],
          } = await space.db.query(Filter.type(Script.Script, { name: scriptName })).run();
          if (script) {
            const {
              objects: [fn],
            } = await space.db.query(Filter.type(Function.Function, { source: Ref.make(script) })).run();
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
            trigger.spec = { kind: 'queue', queue: (template.queueDXN as DXN).toString() };
            break;
          }
          default: {
            break;
          }
        }

        return {
          intents: [
            createIntent(SpaceAction.AddObject, { object: trigger, target: space, hidden: true }),
            createIntent(LayoutAction.Open, {
              part: 'main',
              subject: [`automation-settings${ATTENDABLE_PATH_SEPARATOR}${space.id}`],
              options: {
                workspace: space.id,
              },
            }),
          ],
        };
      },
    }),
  ]);
