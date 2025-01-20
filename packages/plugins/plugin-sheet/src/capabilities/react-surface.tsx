//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';
import { getSpace } from '@dxos/react-client/echo';

import { SheetContainer, SheetObjectSettings } from '../components';
import { SHEET_PLUGIN } from '../meta';
import { SheetType } from '../types';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${SHEET_PLUGIN}/sheet`,
      role: ['article', 'section'],
      filter: (data): data is { subject: SheetType } => data.subject instanceof SheetType && !!getSpace(data.subject),
      component: ({ data, role }) => (
        <SheetContainer space={getSpace(data.subject)!} sheet={data.subject} role={role} />
      ),
    }),
    createSurface({
      id: `${SHEET_PLUGIN}/settings`,
      role: 'complementary--settings',
      filter: (data): data is { subject: SheetType } => data.subject instanceof SheetType,
      component: ({ data }) => <SheetObjectSettings sheet={data.subject} />,
    }),
  ]);
