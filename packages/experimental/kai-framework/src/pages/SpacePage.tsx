//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';

import { Main, useSidebar } from '@dxos/aurora';
import { SpaceState, useSpaces, useIdentity } from '@dxos/react-client';

import { Surface, Sidebar } from '../containers';
import { createPath, defaultFrameId, useAppRouter, useAppState } from '../hooks';
import { SpacePanel } from './SpacePanel';

/**
 * Home page with current space.
 */
const SpacePage = () => {
  useIdentity();
  const { fullscreen } = useAppState();
  const { space, frame, objectId } = useAppRouter();
  const spaces = useSpaces();
  const navigate = useNavigate(); // TODO(burdon): Factor out router (party of app state).
  const [searchParams] = useSearchParams();
  const spaceInvitationCode = searchParams.get('spaceInvitationCode');
  const { sidebarOpen } = useSidebar();

  if (!space && spaces.length > 0 && !spaceInvitationCode) {
    return <Navigate to={createPath({ spaceKey: spaces[0].key, frame: frame?.module.id ?? defaultFrameId })} />;
  }

  // TODO(burdon): Generalize layout with Sidebar and Surfaces.

  if (space && space.state.get() === SpaceState.READY && frame && fullscreen) {
    return (
      <div className='flex w-full h-full overflow-hidden'>
        <Surface space={space} frame={frame} objectId={objectId} fullscreen={fullscreen} />
      </div>
    );
  }

  return (
    // TODO(burdon): Discuss with will; Main seems too heavy and assumes too much about sidebar.
    //  Also, `<main>` should be the content not the container that contains the sidebar.
    <div className='flex flex-col h-full overflow-hidden'>
      <Sidebar
        className={['!block-start-appbar md:is-sidebar', !sidebarOpen && 'md:-inline-start-sidebar']}
        onNavigate={(path) => navigate(path)}
      />
      <Main.Content classNames={['flex flex-col bs-full overflow-hidden', sidebarOpen && 'md:pis-sidebar']}>
        <SpacePanel />
      </Main.Content>
    </div>
  );
};

export default SpacePage;
