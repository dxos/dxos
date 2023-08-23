//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { PanelContainer } from '../../../components';
import { SignalMessageTable } from './SignalMessageTable';
import { SignalStatusTable } from './SignalStatusTable';

export const SignalPanel = () => {
  return (
    <PanelContainer className='divide-y space-y-2'>
      <SignalStatusTable />
      <SignalMessageTable />
    </PanelContainer>
  );
};
