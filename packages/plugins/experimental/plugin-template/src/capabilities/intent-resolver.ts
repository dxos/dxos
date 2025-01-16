//
// Copyright 2025 DXOS.org
//

import { contributes, Capabilities, createResolver } from '@dxos/app-framework';
import { create } from '@dxos/react-client/echo';

import { TemplateAction, TemplateType } from '../types';

export default () =>
  contributes(
    Capabilities.IntentResolver,
    createResolver(TemplateAction.Create, ({ name }) => ({
      data: { object: create(TemplateType, { name }) },
    })),
  );
