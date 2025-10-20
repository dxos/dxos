//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { type Space } from '@dxos/react-client/echo';
import { DataType } from '@dxos/schema';

import { MasonryContainer } from '../components/MasonryContainer';
import { meta } from '../meta';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: meta.id,
      role: ['article', 'section'],
      filter: (data): data is { subject: DataType.View } =>
        Obj.instanceOf(DataType.View, data.subject) && !data.subject.presentation?.target,
      component: ({ data, role }) => <MasonryContainer view={data.subject} role={role} />,
    }),
  ]);
