//
// Copyright 2023 DXOS.org
//

import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import React, { PropsWithChildren, useContext } from 'react';

import { Button } from '@dxos/aurora';
import { getSize } from '@dxos/aurora-theme';
import { PanelSidebarContext, PanelSidebarProvider, useTogglePanelSidebar } from '@dxos/react-shell';

import { Surface } from '../framework';

const SidebarPanel = ({ children }: PropsWithChildren) => {
  const toggleSidebar = useTogglePanelSidebar();
  return (
    <div className='flex flex-col grow'>
      <div className='flex'>
        <Button onClick={toggleSidebar}>
          <CaretLeft className={getSize(5)} />
        </Button>
      </div>
      <div className='flex grow'>{children}</div>
    </div>
  );
};

const MainPanel = ({ children }: PropsWithChildren) => {
  const { displayState } = useContext(PanelSidebarContext);
  const toggleSidebar = useTogglePanelSidebar();
  return (
    <div className='flex grow overflow-hidden'>
      {displayState !== 'show' && (
        <div className='flex flex-col h-full px-2'>
          <div className='flex h-[32px] items-center'>
            <Button onClick={toggleSidebar}>
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
    <PanelSidebarProvider
      inlineStart
      slots={{
        main: { className: 'flex grow overflow-hidden' },
        content: {
          children: (
            <SidebarPanel>
              <Surface id='sidebar' />
            </SidebarPanel>
          )
        }
      }}
    >
      <MainPanel>
        <Surface id='main' />
      </MainPanel>
    </PanelSidebarProvider>
  );
};
