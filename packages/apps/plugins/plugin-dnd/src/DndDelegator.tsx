//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { DelegatorProps } from '@dxos/aurora-grid';
import { Surface } from '@dxos/react-surface';

export const DndDelegator = (props: DelegatorProps) => {
  return <Surface role='mosaic-delegator' limit={1} data={props} />;
};
