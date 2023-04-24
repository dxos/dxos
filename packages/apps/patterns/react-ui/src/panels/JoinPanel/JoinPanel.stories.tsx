import React from 'react';

import '@dxosTheme';
import { JoinPanelComponent } from './JoinPanelComponent';

export default {
  component: JoinPanelComponent,
  actions: { argTypesRegex: '^on.*' }
};

export const Default = (props: any) => {
  return <JoinPanelComponent {...props} />;
};
