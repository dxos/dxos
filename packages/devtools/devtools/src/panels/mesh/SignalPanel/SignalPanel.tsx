//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { mx } from '@dxos/react-ui-theme';

import { SignalMessageTable } from './SignalMessageTable';
import { SignalStatusTable } from './SignalStatusTable';
import { PanelContainer } from '../../../components';
import { styles } from '../../../styles';

export const SignalPanel = () => {
  return (
    <PanelContainer classNames={mx('divide-y space-y-2', styles.border)}>
      <SignalStatusTable />
      <SignalMessageTable />
    </PanelContainer>
  );
};
