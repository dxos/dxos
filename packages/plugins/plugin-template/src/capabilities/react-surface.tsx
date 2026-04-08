//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit';

import { TemplatePanel } from '#components';
import { meta } from '#meta';
import { Template } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(
      Capabilities.ReactSurface,
      Surface.create({
        id: meta.id,
        role: 'article',
        filter: AppSurface.object(Template.Data, { attendable: true }),
        component: ({ data, role }) => (
          <TemplatePanel role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
    ),
  ),
);
