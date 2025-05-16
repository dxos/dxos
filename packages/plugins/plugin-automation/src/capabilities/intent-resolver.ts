//
// Copyright 2025 DXOS.org
//

import {
  contributes,
  Capabilities,
  createResolver,
  type PluginsContext,
  createIntent,
  LayoutAction,
} from '@dxos/app-framework';
import { Type } from '@dxos/echo';
import { FunctionTrigger, FunctionType, ScriptType, TriggerKind } from '@dxos/functions';
import { type DXN } from '@dxos/keys';
import { live } from '@dxos/live-object';
import { ATTENDABLE_PATH_SEPARATOR } from '@dxos/plugin-deck/types';
import { SpaceAction } from '@dxos/plugin-space/types';
import { Filter, Ref } from '@dxos/react-client/echo';

import { AutomationAction } from '../types';

export default (context: PluginsContext) =>
  contributes(Capabilities.IntentResolver, [
    createResolver({
      intent: AutomationAction.CreateTriggerFromTemplate,
      resolve: async ({ space, template, enabled = false, scriptName, input }) => {
        const trigger = live(FunctionTrigger, { enabled, input });

        // TODO(wittjosiah): Factor out function lookup by script name?
        if (scriptName) {
          const {
            objects: [script],
          } = await space.db.query(Filter.type(ScriptType, { name: scriptName })).run();
          if (script) {
            const {
              objects: [fn],
            } = await space.db.query(Filter.type(FunctionType, { source: Ref.make(script) })).run();
            if (fn) {
              trigger.function = Type.ref(fn);
            }
          }
        }

        switch (template.type) {
          case 'timer': {
            trigger.spec = { kind: TriggerKind.Timer, cron: template.cron };
            break;
          }
          case 'queue': {
            trigger.spec = { kind: TriggerKind.Queue, queue: (template.queueDXN as DXN).toString() };
            break;
          }
          default: {
            break;
          }
        }

        return {
          intents: [
            createIntent(SpaceAction.AddObject, { object: trigger, target: space }),
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
