//
// Copyright 2023 DXOS.org
//

import { CaretDoubleLeft, GearSix } from '@phosphor-icons/react';
import React from 'react';

import { Graph } from '@braneframe/plugin-graph';
import { useIntent } from '@braneframe/plugin-intent';
import { Button, DensityProvider, ElevationProvider, Tooltip, useSidebars, useTranslation } from '@dxos/aurora';
import { Mosaic } from '@dxos/aurora-grid';
import { getSize, mx } from '@dxos/aurora-theme';
import { useClient, useConfig } from '@dxos/react-client';
import { useIdentity } from '@dxos/react-client/halo';

import { HaloButton } from './HaloButton';
import { NavTreeRoot } from './NavTree';
import { VersionInfo } from './VersionInfo';
import { TreeViewContext } from '../TreeViewContext';
import { TREE_VIEW_PLUGIN } from '../types';

export const TreeViewContainer = ({
  data: { graph, activeId, popoverAnchorId },
}: {
  data: { graph: Graph; activeId?: string; popoverAnchorId?: string };
}) => {
  const client = useClient();
  const config = useConfig();
  const identity = useIdentity();

  const { t } = useTranslation(TREE_VIEW_PLUGIN);
  const { navigationSidebarOpen } = useSidebars(TREE_VIEW_PLUGIN);
  const { dispatch } = useIntent();

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
                  onClick={() => client.shell.shareIdentity()}
                />
                <div className='grow'></div>
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <Button
                      variant='ghost'
                      classNames='pli-2 pointer-fine:pli-1'
                      {...(!navigationSidebarOpen && { tabIndex: -1 })}
                      onClick={() => {
                        void dispatch({
                          action: 'dxos.org/plugin/splitview/action/open-dialog',
                          data: { content: 'dxos.org/plugin/splitview/ProfileSettings' },
                        });
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
                        void dispatch({
                          action: 'dxos.org/plugin/splitview/action/toggle-sidebar',
                          data: { state: false },
                        });
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
            {/* TODO(wittjosiah): Ideally could pass these into items somehow. */}
            {/*  The context approach doesn't work great because the context isn't available when dragging. */}
            <TreeViewContext.Provider value={{ activeId, popoverAnchorId }}>
              <Mosaic.Root id={TREE_VIEW_PLUGIN}>
                <NavTreeRoot />
              </Mosaic.Root>
            </TreeViewContext.Provider>
          </div>
          <VersionInfo config={config} />
        </div>
      </DensityProvider>
    </ElevationProvider>
  );
};
