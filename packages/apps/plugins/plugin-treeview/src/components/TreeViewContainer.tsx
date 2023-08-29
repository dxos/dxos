//
// Copyright 2023 DXOS.org
//

import { GearSix } from '@phosphor-icons/react';
import React from 'react';

import type { ClientPluginProvides } from '@braneframe/plugin-client';
import { useGraph } from '@braneframe/plugin-graph';
import { useSplitView } from '@braneframe/plugin-splitview';
import {
  Avatar,
  Tree,
  Button,
  DensityProvider,
  ElevationProvider,
  ScrollArea,
  Tooltip,
  useJdenticonHref,
  useSidebars,
  useTranslation,
  Separator,
} from '@dxos/aurora';
import { getSize, mx } from '@dxos/aurora-theme';
import { ShellLayout, useConfig } from '@dxos/react-client';
import { useIdentity } from '@dxos/react-client/halo';
import { findPlugin, usePlugins } from '@dxos/react-surface';

import { TREE_VIEW_PLUGIN } from '../types';
import { NavTreeItem } from './NavTree';
import { VersionInfo } from './VersionInfo';

export const TreeViewContainer = () => {
  const config = useConfig();
  const { plugins } = usePlugins();
  const { graph } = useGraph();

  const identity = useIdentity();
  const jdenticon = useJdenticonHref(identity?.identityKey.toHex() ?? '', 24);
  const { t } = useTranslation(TREE_VIEW_PLUGIN);
  const { navigationSidebarOpen } = useSidebars(TREE_VIEW_PLUGIN);
  const splitViewContext = useSplitView();

  const branches = graph.root.children;
  const clientPlugin = findPlugin<ClientPluginProvides>(plugins, 'dxos.org/plugin/client');

  const openIdentityPanel = () => {
    if (clientPlugin) {
      clientPlugin.provides.setLayout(ShellLayout.DEVICE_INVITATIONS);
    }
  };

  return (
    <ElevationProvider elevation='chrome'>
      <DensityProvider density='fine'>
        <div role='none' className='flex flex-col bs-full'>
          {identity && (
            <>
              <Avatar.Root size={10} variant='circle' status='active'>
                <div
                  role='none'
                  className='shrink-0 flex items-center gap-1 pis-3 pie-1.5 plb-3 pointer-fine:pie-1.5 pointer-fine:plb-1.5'
                >
                  <Avatar.Frame
                    data-testid='treeView.haloButton'
                    classNames='cursor-pointer'
                    onClick={openIdentityPanel}
                  >
                    <Avatar.Fallback href={jdenticon} />
                  </Avatar.Frame>
                  <div className='grow'></div>
                  <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                      <Button
                        variant='ghost'
                        classNames='pli-2 pointer-fine:pli-1'
                        {...(!navigationSidebarOpen && { tabIndex: -1 })}
                        onClick={() => {
                          splitViewContext.dialogOpen = true;
                          splitViewContext.dialogContent = 'dxos.org/plugin/splitview/ProfileSettings';
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
                </div>
              </Avatar.Root>
              <Separator orientation='horizontal' />
            </>
          )}
          <ScrollArea.Root classNames='grow min-bs-0'>
            <ScrollArea.Viewport>
              <Tree.Root role='tree' classNames='pbs-1 pbe-4 pli-1'>
                {branches.map((branch) => (
                  <NavTreeItem key={branch.id} node={branch} level={0} />
                ))}
              </Tree.Root>
              <ScrollArea.Scrollbar orientation='vertical' classNames='pointer-events-none'>
                <ScrollArea.Thumb />
              </ScrollArea.Scrollbar>
            </ScrollArea.Viewport>
          </ScrollArea.Root>
          <VersionInfo config={config} />
        </div>
      </DensityProvider>
    </ElevationProvider>
  );
};
