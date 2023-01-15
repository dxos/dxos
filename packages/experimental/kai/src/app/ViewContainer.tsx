//
// Copyright 2022 DXOS.org
//

import React, { FC } from 'react';

import { mx } from '@dxos/react-components';
import { PanelSidebarProvider } from '@dxos/react-ui';

import { useOptions } from '../hooks';
import { AppBar } from './AppBar';
import { Sidebar } from './Sidebar';
import { ViewSelector } from './ViewSelector';
import { viewConfig } from './views';

export const ViewContainer: FC<{ view: string }> = ({ view }) => {
  const { views } = useOptions();
  const { Component } = viewConfig[view];

  return (
    <PanelSidebarProvider
      inlineStart
      slots={{
        fixedBlockStart: { children: <AppBar />, className: 'bg-orange-400' },
        content: { children: <Sidebar /> }
      }}
    >
      {views.length > 1 && <ViewSelector />}
      <div className={mx(views.length > 1 ? 'pbs-[84px]' : 'pbs-[48px]', 'flex h-screen bg-white')}>
        <Component />
      </div>
    </PanelSidebarProvider>
  );
};
