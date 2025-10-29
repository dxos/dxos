//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { type Space, SpaceState, isSpace } from '@dxos/react-client/echo';
import { DataType } from '@dxos/schema';

import { MasonryContainer, SpaceMain } from '../components';
import { meta } from '../meta';
import { Masonry } from '../types';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: meta.id,
      role: ['article', 'section'],
      filter: (data): data is { subject: DataType.View } =>
        Obj.instanceOf(DataType.View, data.subject) &&
        Obj.instanceOf(Masonry.Masonry, data.subject.presentation?.target),
      component: ({ data, role }) => <MasonryContainer view={data.subject} role={role} />,
    }),
    createSurface({
      id: `${meta.id}/article`,
      role: 'article',
      position: 'hoist',
      filter: (data): data is { subject: Space } =>
        // TODO(wittjosiah): Need to avoid shotgun parsing space state everywhere.
        isSpace(data.subject) && data.subject.state.get() === SpaceState.SPACE_READY,
      component: ({ data }) => <SpaceMain space={data.subject} />,
    }),
  ]);
