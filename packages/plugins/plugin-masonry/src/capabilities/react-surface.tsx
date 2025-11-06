//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { View } from '@dxos/schema';

import { MasonryContainer } from '../components/MasonryContainer';
import { meta } from '../meta';
import { Masonry } from '../types';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: meta.id,
      role: ['article', 'section'],
      filter: (data): data is { subject: View.View } =>
        Obj.instanceOf(View.View, data.subject) && Obj.instanceOf(Masonry.Masonry, data.subject.presentation?.target),
      component: ({ data, role }) => <MasonryContainer view={data.subject} role={role} />,
    }),
  ]);
