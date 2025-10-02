//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface, useCapability } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { getSpace } from '@dxos/react-client/echo';

import { ComputeGraphContextProvider, RangeList, SheetContainer } from '../components';
import { meta } from '../meta';
import { SheetType } from '../types';

import { SheetCapabilities } from './capabilities';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${meta.id}/sheet`,
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
      id: `${meta.id}/object-settings`,
      role: 'object-settings',
      filter: (data): data is { subject: SheetType } => Obj.instanceOf(SheetType, data.subject),
      component: ({ data }) => <RangeList sheet={data.subject} />,
    }),
  ]);
