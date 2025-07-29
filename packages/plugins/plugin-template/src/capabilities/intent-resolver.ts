//
// Copyright 2025 DXOS.org
//

import { contributes, Capabilities, createResolver } from '@dxos/app-framework';

import { Template } from '../types';

export default () =>
  contributes(
    Capabilities.IntentResolver,
    createResolver({
      intent: Template.Create,
      resolve: ({ name }) => ({
        data: { object: Template.make({ name }) },
      }),
    }),
  );
