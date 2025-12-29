//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capability, Common } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';

import { TemplateContainer } from '../components';
import { meta } from '../meta';
import { Template } from '../types';

export default Capability.makeModule(() =>
  Capability.contributes(
    Common.Capability.ReactSurface,
    Common.createSurface({
      id: meta.id,
      role: 'article',
      filter: (data): data is { subject: Obj.Any } => Obj.instanceOf(Template.Data, data.subject),
      component: ({ data, role }: { data: { subject: Obj.Any }; role: string }) => <TemplateContainer role={role} object={data.subject} />,
    }),
  ),
);
