//
// Copyright 2025 DXOS.org
//

import { contributes, Capabilities, createResolver } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';

import { TemplateAction, TemplateType } from '../types';

export default () =>
  contributes(
    Capabilities.IntentResolver,
    createResolver({
      intent: TemplateAction.Create,
      resolve: ({ name }) => ({
        data: { object: Obj.make(TemplateType, { name }) },
      }),
    }),
  );
