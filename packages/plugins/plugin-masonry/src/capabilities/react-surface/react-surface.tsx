//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { Obj } from '@dxos/echo';
import { View } from '@dxos/schema';

import { MasonryContainer } from '../../components/MasonryContainer';
import { meta } from '../../meta';
import { Masonry } from '../../types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: meta.id,
        role: ['article', 'section'],
        filter: (data): data is { subject: Masonry.Masonry | View.View } =>
          Obj.instanceOf(Masonry.Masonry, data.subject) || Obj.instanceOf(View.View, data.subject),
        component: ({ data, role }) => {
          const view = Obj.instanceOf(View.View, data.subject) ? data.subject : data.subject.view;
          return <MasonryContainer view={view} role={role} />;
        },
      }),
    ]),
  ),
);
