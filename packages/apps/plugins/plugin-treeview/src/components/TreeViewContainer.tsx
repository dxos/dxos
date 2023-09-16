//
// Copyright 2023 DXOS.org
//

import { CaretDoubleLeft, GearSix } from '@phosphor-icons/react';
import React from 'react';

import type { ClientPluginProvides } from '@braneframe/plugin-client';
import { useSplitView } from '@braneframe/plugin-splitview';
import { Button, DensityProvider, ElevationProvider, Tooltip, useSidebars, useTranslation } from '@dxos/aurora';
import { Mosaic } from '@dxos/aurora-grid';
import { getSize, mx } from '@dxos/aurora-theme';
import { useConfig } from '@dxos/react-client';
import { useIdentity } from '@dxos/react-client/halo';
import { usePlugin } from '@dxos/react-surface';

import { HaloButton } from './HaloButton';
import { NavTreeRoot } from './NavTree';
import { VersionInfo } from './VersionInfo';
import { TREE_VIEW_PLUGIN } from '../types';

export const TreeViewContainer = () => {
  const config = useConfig();
  const clientPlugin = usePlugin<ClientPluginProvides>('dxos.org/plugin/client');

  const identity = useIdentity();

  const { t } = useTranslation(TREE_VIEW_PLUGIN);
  const { navigationSidebarOpen } = useSidebars(TREE_VIEW_PLUGIN);
  const splitView = useSplitView();

  return (
    <ElevationProvider elevation='chrome'>
      <DensityProvider density='fine'>
        <div role='none' className='flex flex-col bs-full'>
          {identity && (
            <>
              <div
                role='none'
                className='shrink-0 flex items-center gap-1 pis-4 pie-1.5 plb-3 pointer-fine:pie-1.5 pointer-fine:plb-1 bs-10'
              >
                <HaloButton
                  size={6}
                  identityKey={identity?.identityKey.toHex()}
                  onClick={() => clientPlugin?.provides.client.shell.shareIdentity()}
                />
                <div className='grow'></div>
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <Button
                      variant='ghost'
                      classNames='pli-2 pointer-fine:pli-1'
                      {...(!navigationSidebarOpen && { tabIndex: -1 })}
                      onClick={() => {
                        splitView.dialogOpen = true;
                        splitView.dialogContent = 'dxos.org/plugin/splitview/ProfileSettings';
                      }}
                    >
                      <span className='sr-only'>{t('settings dialog title', { ns: 'os' })}</span>
                      <GearSix className={mx(getSize(4), 'rotate-90')} />
                    </Button>
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content classNames='z-[70]'>
                      {t('settings dialog title', { ns: 'os' })}
                      <Tooltip.Arrow />
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <Button
                      variant='ghost'
                      classNames='lg:hidden pli-2 pointer-fine:pli-1'
                      {...(!navigationSidebarOpen && { tabIndex: -1 })}
                      onClick={() => {
                        splitView.sidebarOpen = false;
                      }}
                    >
                      <span className='sr-only'>{t('close sidebar label', { ns: 'os' })}</span>
                      <CaretDoubleLeft className={getSize(4)} />
                    </Button>
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content classNames='z-[70]'>
                      {t('close sidebar label', { ns: 'os' })}
                      <Tooltip.Arrow />
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>
              </div>
              {/* <Separator orientation='horizontal' /> */}
            </>
          )}
          <div role='none' className='grow min-bs-0 overflow-y-auto'>
            <Mosaic.Root id={TREE_VIEW_PLUGIN}>
              <NavTreeRoot />
            </Mosaic.Root>
          </div>
          <VersionInfo config={config} />
        </div>
      </DensityProvider>
    </ElevationProvider>
  );
};
