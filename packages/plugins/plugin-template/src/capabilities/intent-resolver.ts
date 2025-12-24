//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, createResolver, defineCapabilityModule } from '@dxos/app-framework';

import { Template } from '../types';

export default defineCapabilityModule(() =>
  contributes(
    Capabilities.IntentResolver,
    createResolver({
      intent: Template.Create,
      resolve: ({ name }) => ({
        data: { object: Template.make({ name }) },
      }),
    }),
  ),
);
