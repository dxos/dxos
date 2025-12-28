//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, Capability, createSurface } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';

import { MasonryContainer } from '../components/MasonryContainer';
import { meta } from '../meta';
import { Masonry } from '../types';

export default Capability.makeModule(() =>
  Capability.contributes(Capabilities.ReactSurface, [
    createSurface({
      id: meta.id,
      role: ['article', 'section'],
      filter: (data): data is { subject: Masonry.Masonry } => Obj.instanceOf(Masonry.Masonry, data.subject),
      component: ({ data, role }) => <MasonryContainer object={data.subject} role={role} />,
    }),
  ]),
);
