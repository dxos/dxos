//
// Copyright 2022 DXOS.org
//

import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Space } from '@dxos/client';
import { useSpaces } from '@dxos/react-client';
import { mx } from '@dxos/react-components';
import { PanelSidebarProvider } from '@dxos/react-ui';

import { AppBar, FrameContainer, FrameSelector, Sidebar } from '../app';
import { createSpacePath, SpaceContext, SpaceContextType, useActiveFrames, defaultFrameId } from '../hooks';

// TODO(burdon): Factor out.
const matchSpaceKey = (spaces: Space[], spaceKey: string): Space | undefined =>
  spaces.find((space) => space.key.truncate() === spaceKey);

/**
 * Home page with current space.
 */
const SpacePage = () => {
  const navigate = useNavigate();
  const frames = useActiveFrames();
  const { spaceKey: currentSpaceKey, section, frame } = useParams();
  const spaces = useSpaces();
  const space = currentSpaceKey ? matchSpaceKey(spaces, currentSpaceKey) : undefined;
  const [spaceContext, setSpaceContext] = useState<SpaceContextType>();

  // Change space.
  useEffect(() => {
    if (space) {
      setSpaceContext({ space });
    } else {
      navigate('/');
    }
  }, [space]);

  // Change to default view.
  useEffect(() => {
    if (space && (!section || section === 'frame') && (!frame || !frames.find(({ id }) => id === frame))) {
      navigate(createSpacePath(space.key, defaultFrameId));
    }
  }, [currentSpaceKey, section, frame]);

  if (!spaceContext) {
    return null;
  }

  // TODO(burdon): Container of panel (settings, registry or frame).
  return (
    <SpaceContext.Provider value={spaceContext}>
      <PanelSidebarProvider
        inlineStart
        slots={{
          content: { children: <Sidebar />, className: 'block-start-appbar' },
          main: { className: mx(frames.length > 1 ? 'pbs-header' : 'pbs-appbar', 'bs-full overflow-hidden') }
        }}
      >
        <AppBar />
        <FrameSelector />
        <div role='none' className='bs-full overflow-auto overscroll-contain bg-white flex flex-col bg-white'>
          {/* {section === Section.REGISTRY && <FrameRegistry />} */}
          {/* TODO(burdon): Rename (not a page). */}
          {/* {section === Section.SETTINGS && <ManageSpacePage />} */}
          {frame && <FrameContainer frame={frame} />}
        </div>
      </PanelSidebarProvider>
    </SpaceContext.Provider>
  );
};

export default SpacePage;
