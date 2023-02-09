//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { useParams } from 'react-router-dom';

import { useCurrentSpace } from '@dxos/react-client';
import { mx, useTranslation } from '@dxos/react-components';
import { PanelSidebarProvider } from '@dxos/react-ui';

import { FrameContainer, Sidebar, AppBar, FrameSelector } from '../app';
import { useActiveFrames, useDevDataGenerator } from '../hooks';

/**
 * Home page with current space.
 */
const SpacePage = () => {
  useDevDataGenerator();
  const { t } = useTranslation('kai');
  const frames = useActiveFrames();
  const { frame } = useParams();
  const [space] = useCurrentSpace();

  return (
    <PanelSidebarProvider
      inlineStart
      slots={{
        content: { children: <Sidebar />, className: 'block-start-appbar' },
        main: { className: mx(frames.length > 1 ? 'pbs-header' : 'pbs-appbar', 'bs-full overflow-hidden') }
      }}
    >
      <AppBar />
      <FrameSelector />
      {space ? (
        <div role='none' className='bs-full overflow-auto overscroll-contain bg-white flex flex-col bg-white'>
          {frame && <FrameContainer frame={frame} />}
        </div>
      ) : (
        <div className='flex justify-center pbs-4'>{t('select a space')}</div>
      )}
    </PanelSidebarProvider>
  );
};

export default SpacePage;
