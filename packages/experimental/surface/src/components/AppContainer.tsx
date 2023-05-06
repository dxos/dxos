//
// Copyright 2023 DXOS.org
//

import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import React, { PropsWithChildren } from 'react';
import { Outlet } from 'react-router-dom';

import { Button, Main, MainOverlay, MainRoot, Sidebar as SidebarRoot, useMainContext } from '@dxos/aurora';
import { getSize } from '@dxos/aurora-theme';

import { Surface } from '../framework';

const NAME = 'what-does-this-do?';

const SidebarPanel = ({ children }: PropsWithChildren) => {
  const { sidebarOpen, setSidebarOpen } = useMainContext(NAME);
  return (
    <div className='flex flex-col grow'>
      <div className='flex'>
        <Button onClick={() => setSidebarOpen(false)}>
          <CaretLeft className={getSize(5)} />
        </Button>
      </div>
      <div>[[{sidebarOpen}]]</div>
      <div className='flex grow'>{children}</div>
    </div>
  );
};

SidebarPanel.NAME = NAME;

const MainPanel = ({ children }: PropsWithChildren) => {
  const { sidebarOpen, setSidebarOpen } = useMainContext(NAME);
  return (
    <div className='flex grow overflow-hidden'>
      {!sidebarOpen && (
        <div className='flex flex-col h-full px-2'>
          <div className='flex h-[32px] items-center'>
            <Button onClick={() => setSidebarOpen(true)}>
              <CaretRight className={getSize(5)} />
            </Button>
          </div>
        </div>
      )}
      <div className='flex flex-col grow overflow-hidden divide-y divide-zinc-300'>{children}</div>
    </div>
  );
};

export const AppContainer = () => {
  return (
    <MainRoot defaultSidebarOpen>
      <MainOverlay />
      <SidebarRoot className='!block-start-appbar'>
        <SidebarPanel>
          <Surface id='sidebar' />
          <div>SIDEBAR</div>
        </SidebarPanel>
      </SidebarRoot>
      <Main className='pbs-header bs-full overflow-hidden'>
        <MainPanel>
          <div>MAIN</div>
          <Outlet />
        </MainPanel>
      </Main>
    </MainRoot>
  );
};
