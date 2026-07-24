//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { Panel } from '@dxos/react-ui';

import { SignalMessageTable } from './SignalMessageTable';
import { SignalStatusTable } from './SignalStatusTable';

export const SignalPanel = () => {
  return (
    <Panel.Root>
      <Panel.Content classNames='grid grid-rows-[2fr_5fr]'>
        <SignalStatusTable />
        <SignalMessageTable />
      </Panel.Content>
    </Panel.Root>
  );
};
