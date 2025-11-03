//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { PanelContainer } from '../../../components';

import { SignalMessageTable } from './SignalMessageTable';
import { SignalStatusTable } from './SignalStatusTable';

export const SignalPanel = () => (
  <PanelContainer classNames='grid grid-rows-[2fr_5fr]'>
    <SignalStatusTable />
    <SignalMessageTable />
  </PanelContainer>
);
