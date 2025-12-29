//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capability, Common } from '@dxos/app-framework';
import { useCapability } from '@dxos/app-framework/react';
import { Obj } from '@dxos/echo';
import { getSpace } from '@dxos/react-client/echo';

import { ComputeGraphContextProvider, RangeList, SheetContainer } from '../../components';
import { meta } from '../../meta';
import { Sheet, SheetCapabilities } from '../../types';

export default Capability.makeModule(() =>
  Capability.contributes(Common.Capability.ReactSurface, [
    Common.createSurface({
      id: `${meta.id}/sheet`,
      role: ['article', 'section'],
      filter: (data): data is { subject: Sheet.Sheet } =>
        Obj.instanceOf(Sheet.Sheet, data.subject) && !!getSpace(data.subject),
      component: ({ data, role }) => {
        const computeGraphRegistry = useCapability(SheetCapabilities.ComputeGraphRegistry);

        return (
          <ComputeGraphContextProvider registry={computeGraphRegistry}>
            <SheetContainer space={getSpace(data.subject)!} sheet={data.subject} role={role} />
          </ComputeGraphContextProvider>
        );
      },
    }),
    Common.createSurface({
      id: `${meta.id}/object-settings`,
      role: 'object-settings',
      filter: (data): data is { subject: Sheet.Sheet } => Obj.instanceOf(Sheet.Sheet, data.subject),
      component: ({ data }) => <RangeList sheet={data.subject} />,
    }),
  ]),
);
