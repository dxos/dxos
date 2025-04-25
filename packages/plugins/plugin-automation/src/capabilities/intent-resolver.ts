//
// Copyright 2025 DXOS.org
//

import { contributes, Capabilities, createResolver } from '@dxos/app-framework';

import { AutomationAction } from '../types';

export default () =>
  contributes(Capabilities.IntentResolver, [
    createResolver({
      intent: AutomationAction.CreateTriggerFromTemplate,
      resolve: async ({ template }) => {
        switch (template.type) {
          case 'gmail-sync': {
            console.log('gmail-sync', template.mailboxId);
            break;
          }
          case 'queue': {
            console.log('queue', template.queueDXN);
            break;
          }
          default: {
            break;
          }
        }

        return { data: undefined };
      },
    }),
  ]);
