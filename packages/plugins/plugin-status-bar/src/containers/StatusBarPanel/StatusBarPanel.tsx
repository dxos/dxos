//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { Surface } from '@dxos/app-framework/ui';

import StatusBarActionsDefault from '../StatusBarActions';

export type StatusBarPanelProps = {};

export const StatusBarPanel = (_props: StatusBarPanelProps) => {
  return (
    <>
      <StatusBarActionsDefault />
      <span role='separator' className='grow' />
      <Surface.Surface role='status' />
    </>
  );
};
