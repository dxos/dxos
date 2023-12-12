//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { SignalMessageTable } from './SignalMessageTable';
import { SignalStatusTable } from './SignalStatusTable';
import { PanelContainer } from '../../../components';

export const SignalPanel = () => {
  return (
    <PanelContainer classNames='divide-y space-y-2'>
      <SignalStatusTable />
      <SignalMessageTable />
    </PanelContainer>
  );
};
