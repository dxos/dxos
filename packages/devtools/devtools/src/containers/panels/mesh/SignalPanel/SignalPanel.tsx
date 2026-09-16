//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { Panel } from '@dxos/react-ui';

import { SignalMessageTable } from './SignalMessageTable.tsx';
import { SignalStatusTable } from './SignalStatusTable.tsx';

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
