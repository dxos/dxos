//
// Copyright 2022 DXOS.org
//

import { CaretRight } from 'phosphor-react';
import React, { useContext, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Button, getSize, mx } from '@dxos/react-components';
import { PanelSidebarContext, PanelSidebarProvider, useTogglePanelSidebar } from '@dxos/react-ui';

import { AppBar, FrameContainer, FrameSelector, FrameRegistry, Sidebar } from '../containers';
import { Section, createSpacePath, defaultFrameId, useFrameState, useFrames, useTheme } from '../hooks';
import { ManageSpacePage } from '../pages';

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
          <Button compact variant='ghost' className='mx-3 plb-1' onClick={toggleSidebar}>
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
        // TODO (thure): both `block-start` rules are applied, but `mx` is not understanding the `appbar` as a length.
        content: { className: '!block-start-appbar', children: <Sidebar /> },
        main: { className: mx(active.length > 1 ? 'pbs-header' : 'pbs-appbar', 'bs-full overflow-hidden') }
      }}
    >
      <AppBar />
      <Toolbar />

      {/* Main content. */}
      <div role='none' className='flex flex-col bs-full overflow-auto overscroll-contain bg-paper-2-bg'>
        {/* TODO(burdon): Rename ManageSpacePage (not a page). */}
        {section === Section.SETTINGS && <ManageSpacePage />}
        {section === Section.REGISTRY && <FrameRegistry />}
        {frame && <FrameContainer frame={frame} />}
      </div>
    </PanelSidebarProvider>
  );
};

export default SpacePage;
