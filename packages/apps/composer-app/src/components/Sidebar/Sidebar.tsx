//
// Copyright 2023 DXOS.org
//

import { ArrowLineLeft, GearSix, Intersect, Planet, Sidebar } from '@phosphor-icons/react';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Document } from '@braneframe/types';
import {
  Button,
  DensityProvider,
  ElevationProvider,
  ThemeContext,
  useThemeContext,
  useTranslation,
  useSidebar,
} from '@dxos/aurora';
import { getSize, mx, osTx } from '@dxos/aurora-theme';
import { Tooltip, Avatar } from '@dxos/react-appkit';
import { ShellLayout, useClient, useIdentity } from '@dxos/react-client';
import { useShell } from '@dxos/react-shell';

import { getPath } from '../../router';
import { PatDialog } from '../OctokitProvider';
import { Separator } from '../Separator';
import { SidebarTree } from './SidebarTree';

const SIDEBAR_CONTENT_NAME = 'SidebarContent';

const SidebarContent = () => {
  const client = useClient();
  const shell = useShell();
  const navigate = useNavigate();
  const { t } = useTranslation('composer');
  const { sidebarOpen, closeSidebar } = useSidebar(SIDEBAR_CONTENT_NAME);
  const identity = useIdentity();
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const themeContext = useThemeContext();

  const handleCreateSpace = async () => {
    const space = await client.createSpace();
    const document = await space.db.add(new Document());
    return navigate(getPath(space.key, document.id));
  };

  const handleJoinSpace = () => {
    void shell.setLayout(ShellLayout.JOIN_SPACE);
  };

  return (
    <ElevationProvider elevation='chrome'>
      <DensityProvider density='fine'>
        <PatDialog open={settingsDialogOpen} setOpen={setSettingsDialogOpen} />
        <ThemeContext.Provider value={{ ...themeContext, tx: osTx }}>
          <div role='none' className='flex flex-col bs-full'>
            <div role='none' className='shrink-0 flex items-center pli-1.5 plb-1.5'>
              <h1 className={mx('grow font-system-medium text-lg pli-1.5')}>{t('current app name')}</h1>
              <Tooltip
                content={t('create space label', { ns: 'appkit' })}
                zIndex='z-[31]'
                side='bottom'
                tooltipLabelsTrigger
              >
                <Button
                  variant='ghost'
                  data-testid='composer.createSpace'
                  onClick={handleCreateSpace}
                  classNames='pli-2 pointer-fine:pli-1'
                  {...(!sidebarOpen && { tabIndex: -1 })}
                >
                  <Planet className={getSize(4)} />
                </Button>
              </Tooltip>
              <Tooltip
                content={t('join space label', { ns: 'appkit' })}
                zIndex='z-[31]'
                side='bottom'
                tooltipLabelsTrigger
              >
                <Button
                  variant='ghost'
                  data-testid='composer.joinSpace'
                  onClick={handleJoinSpace}
                  classNames='pli-2 pointer-fine:pli-1'
                  {...(!sidebarOpen && { tabIndex: -1 })}
                >
                  <Intersect className={getSize(4)} />
                </Button>
              </Tooltip>
              <Tooltip
                content={t('close sidebar label', { ns: 'os' })}
                zIndex='z-[31]'
                side='bottom'
                tooltipLabelsTrigger
              >
                <Button
                  variant='ghost'
                  data-testid='composer.toggleSidebarWithinSidebar'
                  onClick={closeSidebar}
                  classNames='pli-2 pointer-fine:pli-1'
                  {...(!sidebarOpen && { tabIndex: -1 })}
                >
                  <ArrowLineLeft className={getSize(4)} />
                </Button>
              </Tooltip>
            </div>
            <Separator flush />
            <SidebarTree />
            <Separator flush />
            {identity && (
              <div
                role='none'
                className='shrink-0 flex items-center gap-1 pis-3 pie-1.5 plb-3 pointer-fine:pie-1.5 pointer-fine:plb-1.5'
              >
                <Avatar
                  size={6}
                  variant='circle'
                  fallbackValue={identity.identityKey.toHex()}
                  status='active'
                  label={
                    <p className='grow text-sm'>{identity.profile?.displayName ?? identity.identityKey.truncate()}</p>
                  }
                />
                <Tooltip content={t('profile settings label')} zIndex='z-[31]' side='bottom' tooltipLabelsTrigger>
                  <Button
                    variant='ghost'
                    data-testid='composer.openUserSettingsDialog'
                    onClick={() => setSettingsDialogOpen(true)}
                    classNames='pli-2 pointer-fine:pli-1'
                    {...(!sidebarOpen && { tabIndex: -1 })}
                  >
                    <GearSix className={mx(getSize(4), 'rotate-90')} />
                  </Button>
                </Tooltip>
              </div>
            )}
          </div>
        </ThemeContext.Provider>
      </DensityProvider>
    </ElevationProvider>
  );
};

SidebarContent.displayName = SIDEBAR_CONTENT_NAME;

const SIDEBAR_TOGGLE_NAME = 'SidebarToggle';

const SidebarToggle = () => {
  const { openSidebar, sidebarOpen } = useSidebar(SIDEBAR_TOGGLE_NAME);
  const { t } = useTranslation('os');
  const themeContext = useThemeContext();
  const button = (
    <Button data-testid='composer.toggleSidebar' onClick={openSidebar} classNames='p-0 is-[40px]'>
      <Sidebar weight='light' className={getSize(6)} />
    </Button>
  );
  return (
    <ThemeContext.Provider value={{ ...themeContext, tx: osTx }}>
      <div
        role='none'
        className={mx(
          'fixed z-10 block-end-0 pointer-fine:block-end-auto pointer-fine:block-start-0 p-4 pointer-fine:p-2 transition-[inset-inline-start,opacity] ease-in-out duration-200 inline-start-0',
          sidebarOpen && 'opacity-0 pointer-events-none',
        )}
      >
        {sidebarOpen ? (
          button
        ) : (
          <Tooltip content={t('open sidebar label')} tooltipLabelsTrigger side='right'>
            {button}
          </Tooltip>
        )}
      </div>
    </ThemeContext.Provider>
  );
};

SidebarToggle.displayName = SIDEBAR_TOGGLE_NAME;

export { SidebarContent, SidebarToggle };
