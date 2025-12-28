//
// Copyright 2025 DXOS.org
//

import { Capabilities, Capability, createResolver } from '@dxos/app-framework';

import { Template } from '../types';

export default Capability.makeModule(() =>
  Capability.contributes(
    Capabilities.IntentResolver,
    createResolver({
      intent: Template.Create,
      resolve: ({ name }: { name: string }) => ({
        data: { object: Template.make({ name }) },
      }),
    }),
  ),
);
