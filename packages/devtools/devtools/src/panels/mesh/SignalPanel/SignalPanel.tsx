//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { SignalMessageTable } from './SignalMessageTable';
import { SignalStatusTable } from './SignalStatusTable';
import { PanelContainer } from '../../../components';
import { styles } from '../../../styles';

export const SignalPanel = () => {
  return (
    <PanelContainer classNames={['grid grid-rows-[2fr_5fr]', styles.border]}>
      <SignalStatusTable />
      <SignalMessageTable />
    </PanelContainer>
  );
};
