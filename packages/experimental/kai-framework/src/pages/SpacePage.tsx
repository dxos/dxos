//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';

import { MainRoot, Main, MainOverlay } from '@dxos/aurora';
import { SpaceState, useSpaces, useIdentity } from '@dxos/react-client';

import { Surface, Sidebar } from '../containers';
import { createPath, defaultFrameId, useAppRouter, useAppState } from '../hooks';
import { SpacePanel } from './SpacePanel';

/**
 * Home page with current space.
 */
const SpacePage = () => {
  useIdentity({ login: true });
  const { fullscreen } = useAppState();
  const { space, frame, objectId } = useAppRouter();
  const spaces = useSpaces();
  const navigate = useNavigate(); // TODO(burdon): Factor out router (party of app state).
  const [searchParams] = useSearchParams();
  const spaceInvitationCode = searchParams.get('spaceInvitationCode');

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
    <MainRoot>
      <MainOverlay />
      <Sidebar className='!block-start-appbar' onNavigate={(path) => navigate(path)} />
      <Main className='pbs-header bs-full overflow-hidden'>
        <SpacePanel />
      </Main>
    </MainRoot>
  );
};

export default SpacePage;
