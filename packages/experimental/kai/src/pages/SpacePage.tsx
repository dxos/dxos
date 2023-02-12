//
// Copyright 2022 DXOS.org
//

import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { mx } from '@dxos/react-components';
import { PanelSidebarProvider } from '@dxos/react-ui';

import { AppBar, FrameContainer, FrameSelector, FrameRegistry, Sidebar } from '../containers';
import { Section, createSpacePath, defaultFrameId, useFrameState, useFrames } from '../hooks';
import { ManageSpacePage } from '../pages';

/**
 * Home page with current space.
 */
const SpacePage = () => {
  const navigate = useNavigate();
  const { active } = useFrames();
  const { section } = useParams();
  const { space, frame } = useFrameState();

  // Redirect if invalid space or frame.
  useEffect(() => {
    if (!space) {
      navigate('/');
    } else if (!section || (section === 'frame' && !frame)) {
      navigate(createSpacePath(space!.key, defaultFrameId));
    }
  }, [space, section, frame]);

  if (!space) {
    return null;
  }

  return (
    <PanelSidebarProvider
      inlineStart
      slots={{
        content: { className: 'block-start-appbar', children: <Sidebar /> },
        main: { className: mx(active.length > 1 ? 'pbs-header' : 'pbs-appbar', 'bs-full overflow-hidden') }
      }}
    >
      <AppBar />
      <FrameSelector />

      {/* Main content. */}
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
