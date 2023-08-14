//
// Copyright 2023 DXOS.org
//

import { GearSix } from '@phosphor-icons/react';
import React from 'react';

import { NAVMENU_ROOT, useNavChildren } from '@braneframe/plugin-session';
import { useSplitView } from '@braneframe/plugin-splitview';
import {
  Avatar,
  Tree,
  TreeItem,
  Button,
  DensityProvider,
  ElevationProvider,
  Tooltip,
  useJdenticonHref,
  useSidebar,
  useTranslation,
} from '@dxos/aurora';
import { getSize, mx } from '@dxos/aurora-theme';
import { useIdentity } from '@dxos/react-client/halo';

import { TREE_VIEW_PLUGIN } from '../types';
import { TreeView } from './TreeView';

export const TreeViewContainer = () => {
  const identity = useIdentity({ login: true });
  const jdenticon = useJdenticonHref(identity?.identityKey.toHex() ?? '', 24);
  const { t } = useTranslation(TREE_VIEW_PLUGIN);
  const { sidebarOpen } = useSidebar(TREE_VIEW_PLUGIN);
  const splitViewContext = useSplitView();

  const branches = useNavChildren(NAVMENU_ROOT);

  return (
    <ElevationProvider elevation='chrome'>
      <DensityProvider density='fine'>
        <div role='none' className='flex flex-col bs-full'>
          <div role='separator' className='order-1 bs-px mli-2.5 bg-neutral-500/20' />
          <Tree.Root role='none' classNames='order-1 grow min-bs-0 overflow-y-auto overscroll-contain scroll-smooth'>
            {Object.entries(branches).map(([key, node]) => (
              <TreeItem.Root key={key} classNames='flex flex-col plb-1.5 pis-1 pie-1.5'>
                <TreeItem.Heading classNames='pl-2'>{t('plugin name', { ns: key })}</TreeItem.Heading>
                <TreeView node={node} />
              </TreeItem.Root>
            ))}
          </Tree.Root>
          <div role='none' className='order-first shrink-0 flex items-center pli-1.5 plb-1.5 order-0'>
            <h1 className={mx('grow font-system-medium text-lg pli-1.5')}>{t('current app name', { ns: 'appkit' })}</h1>
          </div>
          {identity && (
            <>
              <div role='separator' className='order-last bs-px mli-2.5 bg-neutral-500/20' />
              <Avatar.Root size={6} variant='circle' status='active'>
                <div
                  role='none'
                  className='order-last shrink-0 flex items-center gap-1 pis-3 pie-1.5 plb-3 pointer-fine:pie-1.5 pointer-fine:plb-1.5'
                >
                  <Avatar.Frame>
                    <Avatar.Fallback href={jdenticon} />
                  </Avatar.Frame>
                  <Avatar.Label classNames='grow text-sm'>
                    {identity.profile?.displayName ?? identity.identityKey.truncate()}
                  </Avatar.Label>
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <Button
                        variant='ghost'
                        classNames='pli-2 pointer-fine:pli-1'
                        {...(!sidebarOpen && { tabIndex: -1 })}
                        onClick={() => {
                          splitViewContext.dialogOpen = true;
                          splitViewContext.dialogContent = 'dxos.org/plugin/splitview/ProfileSettings';
                        }}
                      >
                        <span className='sr-only'>{t('settings dialog title', { ns: 'os' })}</span>
                        <GearSix className={mx(getSize(4), 'rotate-90')} />
                      </Button>
                    </Tooltip.Trigger>
                    <Tooltip.Content>
                      {t('settings dialog title', { ns: 'os' })}
                      <Tooltip.Arrow />
                    </Tooltip.Content>
                  </Tooltip.Root>
                </div>
              </Avatar.Root>
            </>
          )}
        </div>
      </DensityProvider>
    </ElevationProvider>
  );
};
