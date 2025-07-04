//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface, useCapability } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { getSpace } from '@dxos/react-client/echo';

import { SheetCapabilities } from './capabilities';
import { ComputeGraphContextProvider, RangeList, SheetContainer } from '../components';
import { SHEET_PLUGIN } from '../meta';
import { SheetType } from '../types';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${SHEET_PLUGIN}/sheet`,
      role: ['article', 'section'],
      filter: (data): data is { subject: SheetType } =>
        Obj.instanceOf(SheetType, data.subject) && !!getSpace(data.subject),
      component: ({ data, role }) => {
        const computeGraphRegistry = useCapability(SheetCapabilities.ComputeGraphRegistry);

        return (
          <ComputeGraphContextProvider registry={computeGraphRegistry}>
            <SheetContainer space={getSpace(data.subject)!} sheet={data.subject} role={role} />
          </ComputeGraphContextProvider>
        );
      },
    }),
    createSurface({
      id: `${SHEET_PLUGIN}/object-settings`,
      role: 'object-settings',
      filter: (data): data is { subject: SheetType } => Obj.instanceOf(SheetType, data.subject),
      component: ({ data }) => <RangeList sheet={data.subject} />,
    }),
  ]);
