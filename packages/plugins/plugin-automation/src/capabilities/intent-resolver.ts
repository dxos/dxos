//
// Copyright 2025 DXOS.org
//

import { contributes, Capabilities, createResolver } from '@dxos/app-framework';
import { FunctionTrigger, TriggerKind } from '@dxos/functions';
import { type DXN } from '@dxos/keys';
import { create } from '@dxos/live-object';

import { AutomationAction } from '../types';

export default () =>
  contributes(Capabilities.IntentResolver, [
    createResolver({
      intent: AutomationAction.CreateTriggerFromTemplate,
      resolve: async ({ template }) => {
        const trigger = create(FunctionTrigger, { enabled: false });

        switch (template.type) {
          case 'gmail-sync': {
            trigger.spec = { type: TriggerKind.Timer, cron: '*/30 * * * * *' }; // Every 30 seconds.

            // TODO(ZaymonFC): Find the gmail function and set that as the trigger function.

            break;
          }
          case 'queue': {
            trigger.spec = { type: TriggerKind.Queue, queue: (template.queueDXN as DXN).toString() };
            break;
          }
          default: {
            break;
          }
        }

        // TODO: Add new trigger to the space.
        // TODO: Navigate to the new trigger.
        return { data: undefined };
      },
    }),
  ]);
