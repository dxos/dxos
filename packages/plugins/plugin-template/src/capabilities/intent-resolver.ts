//
// Copyright 2025 DXOS.org
//

import { contributes, Capabilities, createResolver } from '@dxos/app-framework';
import { live } from '@dxos/react-client/echo';

import { TemplateAction, TemplateType } from '../types';

export default () =>
  contributes(
    Capabilities.IntentResolver,
    createResolver({
      intent: TemplateAction.Create,
      resolve: ({ name }) => ({
        data: { object: live(TemplateType, { name }) },
      }),
    }),
  );
