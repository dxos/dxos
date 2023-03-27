//
// Copyright 2022 DXOS.org
//

import { CaretRight } from '@phosphor-icons/react';
import React, { Suspense, useContext, useSyncExternalStore } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';

import { SpaceState, useSpaces, Space, useMembers, SpaceMember, useIdentity } from '@dxos/react-client';
import { Button, getSize, Loading, mx } from '@dxos/react-components';
import { PanelSidebarContext, PanelSidebarProvider, useTogglePanelSidebar } from '@dxos/react-ui';

import { AppMenu, BotManager, FrameContainer, Sidebar } from '../containers';
import { ChatFrameRuntime } from '../frames/Chat';
import { useAppRouter, useTheme, Section, createPath, defaultFrameId, useAppState } from '../hooks';

/**
 * Home page with current space.
 */
const SpacePage = () => {
  const { fullscreen } = useAppState();
  const { space, frame } = useAppRouter();
  const spaces = useSpaces();
  const navigate = useNavigate(); // TODO(burdon): Factor out router (party of app state).

  if (!space && spaces.length > 0) {
    return <Navigate to={createPath({ spaceKey: spaces[0].key, frame: frame?.module.id ?? defaultFrameId })} />;
  }

  if (space && space.state.get() === SpaceState.READY && frame && fullscreen) {
    return (
      <div className='flex w-full h-full overflow-hidden'>
        <FrameContainer space={space} frame={frame} />
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
  const { chat } = useAppState();
  const { space, frame } = useAppRouter();
  const { section } = useParams();
  const toggleSidebar = useTogglePanelSidebar();
  const { displayState } = useContext(PanelSidebarContext);

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
              <FrameContainer space={space} frame={frame} />

              {chat && frame.module.id !== 'dxos.module.frame.chat' && (
                <div className='flex shrink-0 w-sidebar'>
                  <Suspense>
                    <ChatFrameRuntime.Component />
                  </Suspense>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        space && <SpaceLoading space={space} />
      )}
    </main>
  );
};

const SpaceLoading = ({ space }: { space: Space }) => {
  const identity = useIdentity();
  // TODO(dmaretskyi): const pipelineState = useObservable(space.pipeline)
  const pipelineState = useSyncExternalStore(
    (listener) => {
      const subscription = space.pipeline.subscribe(listener);
      return () => subscription.unsubscribe();
    },
    () => space.pipeline.get()
  );

  // +1 for the pipeline itself being initialized
  const currentProgress =
    (pipelineState.currentControlTimeframe?.totalMessages() ?? -1) +
    (pipelineState.currentDataTimeframe?.totalMessages() ?? -1) +
    2;
  const targetProgress =
    (pipelineState.targetControlTimeframe?.totalMessages() ?? -1) +
    (pipelineState.targetDataTimeframe?.totalMessages() ?? -1) +
    2;

  const members = useMembers(space.key);
  const onlinePeers = members.filter(
    (member) =>
      member.presence === SpaceMember.PresenceState.ONLINE &&
      (!identity?.identityKey || !member.identity.identityKey.equals(identity?.identityKey))
  ).length;

  return (
    // center div vertically
    <div className='flex flex-col justify-center h-full'>
      <Loading label='Space loading' />
      <div className='flex justify-center'>
        {currentProgress} / {targetProgress}
      </div>
      <div className='flex justify-center'>
        {onlinePeers} / {members.length} peers online
      </div>
    </div>
  );
};

export default SpacePage;
