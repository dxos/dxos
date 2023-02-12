//
// Copyright 2022 DXOS.org
//

import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { mx } from '@dxos/react-components';
import { PanelSidebarProvider } from '@dxos/react-ui';

import { AppBar, FrameContainer, FrameSelector, FrameRegistry, Sidebar } from '../app';
import { Section, createSpacePath, defaultFrameId, useFrames, useSpace } from '../hooks';
import { ManageSpacePage } from '../pages';

/**
 * Home page with current space.
 */
const SpacePage = () => {
  const navigate = useNavigate();
  const { active: activeFrames } = useFrames();
  const { spaceKey: currentSpaceKey, section, frame } = useParams();
  const space = useSpace();

  // Change space.
  useEffect(() => {
    if (!space) {
      navigate('/');
    }
  }, [space]);

  // Change to default view.
  useEffect(() => {
    // Default frame if current frame not found.
    if (space && (!section || section === 'frame') && (!frame || !activeFrames.find((frameId) => frameId === frame))) {
      navigate(createSpacePath(space.key, defaultFrameId));
    }
  }, [currentSpaceKey, section, frame]);

  if (!space) {
    return null;
  }

  // TODO(burdon): Container of panel (settings, registry or frame).
  return (
    <PanelSidebarProvider
      inlineStart
      slots={{
        content: { children: <Sidebar />, className: 'block-start-appbar' },
        main: { className: mx(activeFrames.length > 1 ? 'pbs-header' : 'pbs-appbar', 'bs-full overflow-hidden') }
      }}
    >
      <AppBar />
      <FrameSelector />
      <div role='none' className='bs-full overflow-auto overscroll-contain bg-white flex flex-col bg-white'>
        {/* TODO(burdon): Rename (not a page). */}
        {section === Section.SETTINGS && <ManageSpacePage />}
        {section === Section.REGISTRY && <FrameRegistry />}
        {frame && <FrameContainer frame={frame} />}
      </div>
    </PanelSidebarProvider>
  );
};

export default SpacePage;
