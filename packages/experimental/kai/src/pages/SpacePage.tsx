//
// Copyright 2022 DXOS.org
//

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useSpaces } from '@dxos/react-client';
import { mx } from '@dxos/react-components';
import { PanelSidebarProvider } from '@dxos/react-ui';

import { createSpacePath, matchSpaceKey, FrameContainer, Sidebar, AppBar, FrameSelector } from '../app';
import { SpaceContext, SpaceContextType, useActiveFrames, defaultFrameId } from '../hooks';

/**
 * Home page with current space.
 */
export const SpacePage = () => {
  const navigate = useNavigate();
  const frames = useActiveFrames();
  const [context, setContext] = useState<SpaceContextType | undefined>();
  const { spaceKey: currentSpaceKey, frame } = useParams();
  const spaces = useSpaces();
  const space = currentSpaceKey ? matchSpaceKey(spaces, currentSpaceKey) : undefined;

  // Change space.
  useEffect(() => {
    if (space) {
      setContext({ space });
    } else {
      navigate('/');
    }
  }, [space]);

  // Change to default view.
  useEffect(() => {
    if (space && (!frame || !frames.find(({ id }) => id === frame))) {
      navigate(createSpacePath(space.key, defaultFrameId));
    }
  }, [currentSpaceKey, frame]);

  if (!context) {
    return null;
  }

  // prettier-ignore
  return (
    <SpaceContext.Provider value={context}>
      <PanelSidebarProvider
        inlineStart
        slots={{
          content: { children: <Sidebar />, className: 'block-start-[48px]' },
          main: { className: mx(frames.length > 1 ? 'pbs-[84px]' : 'pbs-[48px]', 'bs-screen flex flex-col bg-white') }
        }}
      >
        <AppBar />
        <FrameSelector />
        <FrameContainer frame={} />
      </PanelSidebarProvider>
    </SpaceContext.Provider>
  );
};
