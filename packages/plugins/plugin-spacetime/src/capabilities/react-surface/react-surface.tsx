//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { Obj } from '@dxos/echo';

import { SpacetimeArticle } from '../../containers';
import { meta } from '../../meta';
import { Spacetime } from '../../types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(
      Capabilities.ReactSurface,
      Surface.create({
        id: meta.id,
        role: 'article',
        filter: (data): data is { subject: Spacetime.Scene } => Obj.instanceOf(Spacetime.Scene, data.subject),
        component: ({ data, role }: { data: { subject: Spacetime.Scene }; role: string }) => (
          <SpacetimeArticle role={role} subject={data.subject} />
        ),
      }),
    ),
  ),
);
