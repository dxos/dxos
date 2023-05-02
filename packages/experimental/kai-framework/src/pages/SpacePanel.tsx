//
// Copyright 2022 DXOS.org
//

import { CaretRight } from '@phosphor-icons/react';
import React, { useContext } from 'react';
import { useParams } from 'react-router-dom';

import { Button } from '@dxos/aurora';
import { getSize, mx } from '@dxos/aurora-theme';
import { FrameDef, useFrameRegistry } from '@dxos/kai-frames';
import { SpaceState } from '@dxos/react-client';
import { PanelSidebarContext, useTogglePanelSidebar } from '@dxos/react-shell';

import { AppMenu, BotManager, Surface, MetagraphPanel } from '../containers';
import { Section, useAppRouter, useAppState, useTheme } from '../hooks';
import { SpaceLoading } from './SpaceLoading';

export const SpacePanel = () => {
  const theme = useTheme();
  const { chat, dev, fullscreen } = useAppState();
  const { space, frame, objectId } = useAppRouter();
  const { section } = useParams();
  const toggleSidebar = useTogglePanelSidebar();
  const { displayState } = useContext(PanelSidebarContext);

  const frameRegistry = useFrameRegistry();
  let sidebarFrameDef: FrameDef<any> | undefined;
  if (chat && frame?.module.id !== 'dxos.module.frame.chat') {
    sidebarFrameDef = frameRegistry.getFrameDef('dxos.module.frame.chat');
  }

  if (!space) {
    return null;
  }

  return (
    <div className='flex flex-col bs-full overflow-hidden'>
      {space?.state.get() === SpaceState.READY && (
        <div className={mx('flex shrink-0 h-[40px] p-2 items-center', theme.classes.header)}>
          {displayState !== 'show' && (
            <Button variant='ghost' onClick={toggleSidebar}>
              {<CaretRight className={getSize(6)} />}
            </Button>
          )}

          <div className='grow' />
          <AppMenu />
        </div>
      )}

      {/* Main content. */}
      {space?.state.get() === SpaceState.READY ? (
        <main role='none' className='flex flex-col bs-full overflow-hidden bg-paper-2-bg'>
          {section === Section.DMG && <MetagraphPanel />}
          {section === Section.BOTS && <BotManager />}
          {frame && (
            <div className='flex flex-1 overflow-hidden'>
              <Surface space={space} frame={frame} objectId={objectId} fullscreen={fullscreen} />

              {/* TODO(burdon): Right-side sidebar. */}
              {sidebarFrameDef && (
                <div className='flex relative'>
                  <div className='flex absolute right-0 w-sidebar h-full z-50'>
                    <Surface space={space} frame={sidebarFrameDef} />
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      ) : (
        space && dev && <SpaceLoading space={space} />
      )}
    </div>
  );
};
