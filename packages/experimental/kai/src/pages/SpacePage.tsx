//
// Copyright 2022 DXOS.org
//

import { CaretRight } from 'phosphor-react';
import React, { useContext } from 'react';
import { Navigate, useParams } from 'react-router-dom';

import { useSpaces } from '@dxos/react-client';
import { Button, getSize, mx } from '@dxos/react-components';
import { PanelSidebarContext, PanelSidebarProvider, useTogglePanelSidebar } from '@dxos/react-ui';

import { BotFrame } from '..//frames';
import { FrameContainer, FrameSelector, FrameRegistry, Sidebar, AppMenu } from '../containers';
import { useAppRouter, useTheme, Section, createPath, defaultFrameId } from '../hooks';

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
  const { space, frame } = useAppRouter();
  const spaces = useSpaces();

  if (!space && spaces.length > 0) {
    return <Navigate to={createPath({ spaceKey: spaces[0].key, frame: frame?.module.id ?? defaultFrameId })} />;
  }

  return (
    <PanelSidebarProvider
      inlineStart
      slots={{
        // TODO(thure): both `block-start` rules are applied, but `mx` is not understanding the `appbar` as a length.
        content: { className: '!block-start-appbar', children: <Sidebar /> },
        main: { className: 'pbs-header bs-full overflow-hidden' }
      }}
    >
      <Content />
    </PanelSidebarProvider>
  );
};

const Content = () => {
  const theme = useTheme();
  const { space, frame } = useAppRouter();
  const { section } = useParams();
  const toggleSidebar = useTogglePanelSidebar();
  const { displayState } = useContext(PanelSidebarContext);

  return (
    <div className='flex flex-col bs-full overflow-hidden'>
      {/* TODO(burdon): Frame toolbar. */}
      <div className={mx('flex shrink-0 h-[40px] p-2 items-center', theme.classes.header)}>
        {displayState !== 'show' && (
          <Button variant='ghost' onClick={toggleSidebar}>
            {<CaretRight className={getSize(6)} />}
          </Button>
        )}

        <div className='grow' />
        <AppMenu />
      </div>

      <div className={mx('flex h-[8px]', theme.classes.toolbar)} />

      {/* Main content. */}
      {space && (
        <div role='none' className='flex flex-col bs-full overflow-hidden bg-paper-2-bg'>
          {section === Section.REGISTRY && <FrameRegistry />}
          {section === Section.BOTS && <BotFrame />}
          {frame && <FrameContainer frame={frame} />}
        </div>
      )}
    </div>
  );
};

export default SpacePage;
