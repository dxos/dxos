//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface, useCapability } from '@dxos/app-framework/ui';
import { Obj } from '@dxos/echo';
import { getSpace } from '@dxos/react-client/echo';

import { RangeList, SheetContainer } from '../../containers';
import { meta } from '../../meta';
import { Sheet, SheetCapabilities } from '../../types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: `${meta.id}/sheet`,
        role: ['article', 'section'],
        filter: (data): data is { subject: Sheet.Sheet } =>
          Obj.instanceOf(Sheet.Sheet, data.subject) && !!getSpace(data.subject),
        component: ({ data, role }) => {
          const computeGraphRegistry = useCapability(SheetCapabilities.ComputeGraphRegistry);

          return (
            <SheetContainer
              role={role}
              subject={data.subject}
              space={getSpace(data.subject)!}
              registry={computeGraphRegistry}
            />
          );
        },
      }),
      Surface.create({
        id: `${meta.id}/object-settings`,
        role: 'object-settings',
        filter: (data): data is { subject: Sheet.Sheet } => Obj.instanceOf(Sheet.Sheet, data.subject),
        component: ({ data }) => <RangeList sheet={data.subject} />,
      }),
    ]),
  ),
);
