//
// Copyright 2025 DXOS.org
//

import { Capability, Common, createResolver } from '@dxos/app-framework';

import { Template } from '../../types';

export default Capability.makeModule(() =>
  Capability.contributes(
    Common.Capability.IntentResolver,
    createResolver({
      intent: Template.Create,
      resolve: ({ name }: { name: string }) => ({
        data: { object: Template.make({ name }) },
      }),
    }),
  ),
);
