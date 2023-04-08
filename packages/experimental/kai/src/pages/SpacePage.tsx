//
// Copyright 2022 DXOS.org
//

import { CaretRight } from '@phosphor-icons/react';
import React, { Suspense, useContext } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';

import { useFrameRegistry } from '@dxos/kai-frames';
import { SpaceState, useSpaces, useIdentity } from '@dxos/react-client';
import { Button, getSize, mx } from '@dxos/react-components';
import { PanelSidebarContext, PanelSidebarProvider, useTogglePanelSidebar } from '@dxos/react-ui';

import { AppMenu, BotManager, FrameContainer, Sidebar } from '../containers';
import { Section, createPath, defaultFrameId, useAppRouter, useAppState, useTheme } from '../hooks';
import { SpaceLoading } from './SpaceLoading';

/**
 * Home page with current space.
 */
const SpacePage = () => {
  useIdentity({ login: true });
  const { fullscreen } = useAppState();
  const { space, frame, objectId } = useAppRouter();
  const spaces = useSpaces();
  const navigate = useNavigate(); // TODO(burdon): Factor out router (party of app state).

  if (!space && spaces.length > 0) {
    return <Navigate to={createPath({ spaceKey: spaces[0].key, frame: frame?.module.id ?? defaultFrameId })} />;
  }

  if (space && space.state.get() === SpaceState.READY && frame && fullscreen) {
    return (
      <div className='flex w-full h-full overflow-hidden'>
        <FrameContainer space={space} frame={frame} objectId={objectId} fullscreen={fullscreen} />
      </div>
    );
  }

  return (
    <PanelSidebarProvider
      inlineStart
      slots={{
        // TODO(thure): both `block-start` rules are applied, but `mx` is not understanding the `appbar` as a length.
        content: { className: '!block-start-appbar', children: <Sidebar onNavigate={(path) => navigate(path)} /> },
        main: { className: 'pbs-header bs-full overflow-hidden' }
      }}
    >
      <Content />
    </PanelSidebarProvider>
  );
};

const Content = () => {
  const theme = useTheme();
  const { chat, dev, fullscreen } = useAppState();
  const { space, frame, objectId } = useAppRouter();
  const { section } = useParams();
  const toggleSidebar = useTogglePanelSidebar();
  const { displayState } = useContext(PanelSidebarContext);

  const frameRegistry = useFrameRegistry();
  const frameDef = frameRegistry.getFrameDef('dxos.module.frame.chat');
  const { Component } = frameDef?.runtime ?? {};

  return (
    <main className='flex flex-col bs-full overflow-hidden'>
      <div className={mx('flex shrink-0 h-[40px] p-2 items-center', theme.classes.header)}>
        {displayState !== 'show' && (
          <Button variant='ghost' onClick={toggleSidebar}>
            {<CaretRight className={getSize(6)} />}
          </Button>
        )}

        <div className='grow' />
        <AppMenu />
      </div>

      {/* Main content. */}
      {space?.state.get() === SpaceState.READY ? (
        <div role='none' className='flex flex-col bs-full overflow-hidden bg-paper-2-bg'>
          {section === Section.BOTS && <BotManager />}
          {frame && (
            <div className='flex flex-1 overflow-hidden'>
              <FrameContainer space={space} frame={frame} objectId={objectId} fullscreen={fullscreen} />

              {/* TODO(burdon): Generalize container. */}
              {chat && frame.module.id !== 'dxos.module.frame.chat' && Component && (
                <div className='flex shrink-0 w-sidebar'>
                  <Suspense>
                    <Component />
                  </Suspense>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        space && dev && <SpaceLoading space={space} />
      )}
    </main>
  );
};

export default SpacePage;
