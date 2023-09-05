//
// Copyright 2023 DXOS.org
//

import { GearSix } from '@phosphor-icons/react';
import React from 'react';

import type { ClientPluginProvides } from '@braneframe/plugin-client';
import { Graph, useGraph } from '@braneframe/plugin-graph';
import { useSplitView } from '@braneframe/plugin-splitview';
import {
<<<<<<< HEAD
  Avatar,
=======
  Tree,
>>>>>>> 39698885d (wip cosmetics)
  Button,
  DensityProvider,
  ElevationProvider,
  ScrollArea,
  Tooltip,
  useSidebars,
  useTranslation,
  Separator,
} from '@dxos/aurora';
import { getSize, mx } from '@dxos/aurora-theme';
import { ShellLayout, useConfig } from '@dxos/react-client';
import { Identity, useIdentity } from '@dxos/react-client/halo';
import { findPlugin, usePlugins } from '@dxos/react-surface';

import { TREE_VIEW_PLUGIN } from '../types';
<<<<<<< HEAD
import { NavTree } from './NavTree';
=======
import { HaloButton } from './HaloButton';
import { NavTreeItem } from './NavTree';
>>>>>>> 39698885d (wip cosmetics)
import { VersionInfo } from './VersionInfo';
import { VersionLabelProps } from './VersionLabel';

export const TreeViewContainer = () => {
  const config = useConfig();
  const { plugins } = usePlugins();
  const { graph } = useGraph();

  const identity = useIdentity();

<<<<<<< HEAD
=======
  const { navigationSidebarOpen } = useSidebars(TREE_VIEW_PLUGIN);
  const splitViewContext = useSplitView();

>>>>>>> 39698885d (wip cosmetics)
  const clientPlugin = findPlugin<ClientPluginProvides>(plugins, 'dxos.org/plugin/client');

  return (
    <TreeView
      identity={identity}
      graphNodes={graph.root.children}
      version={config.values.runtime?.app?.build}
      sidebarOpen={navigationSidebarOpen}
      onHaloButtonClick={() => {
        if (clientPlugin) {
          clientPlugin.provides.setLayout(ShellLayout.DEVICE_INVITATIONS);
        }
      }}
      onSettingsClick={() => {
        splitViewContext.dialogOpen = true;
        splitViewContext.dialogContent = 'dxos.org/plugin/splitview/ProfileSettings';
      }}
    />
  );
};

export type TreeViewProps = {
  identity?: Identity | null;
  graphNodes?: Graph.Node[];
  sidebarOpen?: boolean;
  version?: VersionLabelProps;
  onHaloButtonClick?: () => void;
  onSettingsClick?: () => void;
};

export const TreeView = (props: TreeViewProps) => {
  const { identity, graphNodes, version, sidebarOpen, onHaloButtonClick, onSettingsClick } = props;

  const { t } = useTranslation(TREE_VIEW_PLUGIN);

  return (
    <ElevationProvider elevation='chrome'>
      <DensityProvider density='fine'>
        <div role='none' className='flex flex-col bs-full'>
          {identity && (
            <div
              role='none'
              className='shrink-0 flex items-center gap-1 pis-3 pie-1.5 plb-3 pointer-fine:pie-1.5 pointer-fine:plb-1.5'
            >
              <HaloButton identity={identity} onClick={onHaloButtonClick} />
              <div className='grow'></div>
              <Separator orientation='horizontal' />
              <Tooltip.Provider>
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <Button
                      variant='ghost'
                      classNames='pli-2 pointer-fine:pli-1'
                      {...(!sidebarOpen && { tabIndex: -1 })}
                      onClick={onSettingsClick}
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
              </Tooltip.Provider>
            </div>
          )}
          <ScrollArea.Root classNames='grow min-bs-0'>
            <ScrollArea.Viewport>
              <NavTree
                level={0}
                role='tree'
                classNames='pbs-1 pbe-4 pli-1'
                node={graph.root}
                items={graph.root.children}
              />
              <ScrollArea.Scrollbar orientation='vertical' classNames='pointer-events-none'>
                <ScrollArea.Thumb />
              </ScrollArea.Scrollbar>
            </ScrollArea.Viewport>
          </ScrollArea.Root>
          <VersionInfo {...version} />
        </div>
      </DensityProvider>
    </ElevationProvider>
  );
};
