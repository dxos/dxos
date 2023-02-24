//
// Copyright 2022 DXOS.org
//

import { CaretRight } from 'phosphor-react';
import React, { useContext } from 'react';
import { useParams } from 'react-router-dom';

import { Button, getSize, mx } from '@dxos/react-components';
import { PanelSidebarContext, PanelSidebarProvider, useTogglePanelSidebar } from '@dxos/react-ui';

import { AppBar, FrameContainer, FrameSelector, FrameRegistry, Sidebar } from '../containers';
import { useAppRouter, useTheme, useGenerator, Section } from '../hooks';

const Toolbar = () => {
  const theme = useTheme();
  const { displayState } = useContext(PanelSidebarContext);
  const isOpen = displayState === 'show';
  const toggleSidebar = useTogglePanelSidebar();

  return (
    <div
      className={mx(
        'flex flex-col-reverse bg-appbar-toolbar',
        theme.classes?.toolbar,
        theme.panel === 'flat' && 'border-b',
        'fixed inline-end-0 block-start-appbar bs-toolbar transition-[inset-inline-start] duration-200 ease-in-out z-[1]',
        isOpen ? 'inline-start-0 lg:inline-start-sidebar' : 'inline-start-0'
      )}
    >
      <div className='flex'>
        {!isOpen && (
          <Button variant='ghost' className='mx-3 plb-1' onClick={toggleSidebar}>
            {<CaretRight className={getSize(6)} />}
          </Button>
        )}

        <FrameSelector />
      </div>
    </div>
  );
};

/**
 * Home page with current space.
 */
const SpacePage = () => {
  useGenerator();
  const { section } = useParams();
  const { space, frame } = useAppRouter();

  console.log(section, frame);

  return (
    <PanelSidebarProvider
      inlineStart
      slots={{
        // TODO(thure): both `block-start` rules are applied, but `mx` is not understanding the `appbar` as a length.
        content: { className: '!block-start-appbar', children: <Sidebar /> },
        main: { className: 'pbs-header bs-full overflow-hidden' }
      }}
    >
      <AppBar />
      <Toolbar />

      {/* Main content. */}
      {space && (
        <div role='none' className='flex flex-col bs-full overflow-auto overscroll-contain bg-paper-2-bg'>
          {section === Section.REGISTRY && <FrameRegistry />}
          {frame && <FrameContainer frame={frame} />}
        </div>
      )}
    </PanelSidebarProvider>
  );
};

export default SpacePage;
