//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { Obj } from '@dxos/echo';

import { TemplateContainer } from '../../components';
import { meta } from '../../meta';
import { Template } from '../../types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(
      Capabilities.ReactSurface,
      Surface.create({
        id: meta.id,
        role: 'article',
        filter: (data): data is { subject: Obj.Unknown } => Obj.instanceOf(Template.Data, data.subject),
        component: ({ data, role }: { data: { subject: Obj.Unknown }; role: string }) => (
          <TemplateContainer role={role} subject={data.subject} />
        ),
      }),
    ),
  ),
);
