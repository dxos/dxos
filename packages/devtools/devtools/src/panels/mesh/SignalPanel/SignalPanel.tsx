//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { Panel } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { SignalMessageTable } from './SignalMessageTable';
import { SignalStatusTable } from './SignalStatusTable';

export const SignalPanel = () => {
  return (
    <Panel.Root classNames='bs-full'>
      <Panel.Content classNames={mx('overflow-auto', 'grid grid-rows-[2fr_5fr]')}>
        <SignalStatusTable />
        <SignalMessageTable />
      </Panel.Content>
    </Panel.Root>
  );
};
