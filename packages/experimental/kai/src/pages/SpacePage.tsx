//
// Copyright 2022 DXOS.org
//

import { CaretRight } from '@phosphor-icons/react';
import React, { useContext } from 'react';
import { Navigate, useParams } from 'react-router-dom';

import { useSpaces } from '@dxos/react-client';
import { Button, getSize, mx } from '@dxos/react-components';
import { PanelSidebarContext, PanelSidebarProvider, useTogglePanelSidebar } from '@dxos/react-ui';

import { AppMenu, BotManager, FrameContainer, FrameRegistry, Sidebar } from '../containers';
import { useAppRouter, useTheme, Section, createPath, defaultFrameId } from '../hooks';

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
          {section === Section.BOTS && <BotManager />}
          {frame && <FrameContainer frame={frame} />}
        </div>
      )}
    </div>
  );
};

export default SpacePage;
