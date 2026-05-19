//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type Routine } from '@dxos/compute';
import { Panel } from '@dxos/react-ui';
import { ObjectProperties } from '@dxos/react-ui-form';

export type RoutinePropertiesProps = {
  routine: Routine.Routine;
};

export const RoutineProperties = ({ routine }: RoutinePropertiesProps) => {
  return (
    <Panel.Root>
      <Panel.Content asChild>
        <ObjectProperties object={routine} />
      </Panel.Content>
    </Panel.Root>
  );
};
