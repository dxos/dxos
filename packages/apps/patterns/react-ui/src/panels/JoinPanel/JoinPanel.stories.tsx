//
// Copyright 2023 DXOS.org
//

import React from 'react';

import '@dxosTheme';
import { JoinPanelComponent } from './JoinPanelComponent';
import { joinMachine } from './joinMachine';

export default {
  component: JoinPanelComponent,
  actions: { argTypesRegex: '^on.*' }
};

export const Default = (props: any) => {
  return <JoinPanelComponent {...{ state: joinMachine.initialState, ...props }} />;
};
