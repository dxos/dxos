//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface, defineCapabilityModule } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';

import { TemplateContainer } from '../components';
import { meta } from '../meta';
import { Template } from '../types';

export default defineCapabilityModule(() =>
  contributes(
    Capabilities.ReactSurface,
    createSurface({
      id: meta.id,
      role: 'article',
      filter: (data): data is { subject: Obj.Any } => Obj.instanceOf(Template.Data, data.subject),
      component: ({ data, role }) => <TemplateContainer role={role} object={data.subject} />,
    }),
  ),
);
