//
// Copyright 2023 DXOS.org
//

import { CaretDoubleLeft, GearSix } from '@phosphor-icons/react';
import React, { useCallback, useMemo } from 'react';

import { type Graph } from '@braneframe/plugin-graph';
import { useIntent } from '@braneframe/plugin-intent';
import { Button, DensityProvider, ElevationProvider, Tooltip, useSidebars, useTranslation } from '@dxos/aurora';
import { Path, type MosaicDropEvent, type MosaicMoveEvent } from '@dxos/aurora-grid/next';
import {
  NavTree,
  type NavTreeContextType,
  nextRearrangeIndex,
  type TreeNode,
  type NavTreeProps,
} from '@dxos/aurora-navtree';
import { getSize, mx } from '@dxos/aurora-theme';
import { useClient, useConfig } from '@dxos/react-client';
import { useIdentity } from '@dxos/react-client/halo';

import { HaloButton } from './HaloButton';
import { VersionInfo } from './VersionInfo';
import { TREE_VIEW_PLUGIN } from '../types';
import { getPersistenceParent } from '../util';

const graphNodeCompare = (a: TreeNode, b: TreeNode) => {
  if (a.properties.index && b.properties.index) {
    if (a.properties.index < b.properties.index) {
      return -1;
    } else if (a.properties.index > b.properties.index) {
      return 1;
    }
    return 0;
  }
  return 0;
};

const getMosaicPath = (graph: Graph, id: string) => {
  const parts = graph.getPath(id)?.filter((part) => part !== 'childrenMap');
  return parts ? Path.create('root', ...parts) : undefined;
};

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

  const handleSelect: NavTreeContextType['onSelect'] = async ({ node }: { node: TreeNode }) => {
    await dispatch({
      action: 'dxos.org/plugin/splitview/action/activate',
      data: {
        id: node.id,
      },
    });
    // void defaultAction?.invoke();
    // !isLg && closeNavigationSidebar();
  };

  const currentPath: string = useMemo(() => {
    return (activeId && getMosaicPath(graph, activeId)) ?? 'never';
  }, [graph, activeId]);

  const isOver: NavTreeProps['isOver'] = ({ path, operation, activeItem, overItem }) => {
    const activeNode = activeItem && graph.findNode(Path.last(activeItem.path));
    const overNode = overItem && graph.findNode(Path.last(overItem.path));
    if (!overNode || !activeNode || (operation !== 'adopt' && operation !== 'copy')) {
      return false;
    }

    const activeClass = activeNode.properties.persistenceClass;
    if (overNode.properties.acceptPersistenceClass?.has(activeClass)) {
      return overItem.path === path;
    } else {
      const overAcceptParent = getPersistenceParent(overNode, activeClass);
      return overAcceptParent ? getMosaicPath(graph, overAcceptParent.id) === path : false;
    }
  };

  const handleOver = useCallback(
    ({ active, over }: MosaicMoveEvent<number>) => {
      // Reject all operations that don’t match the graph’s root id
      if (Path.first(active.path) !== graph.root.id || Path.first(over.path) !== Path.first(active.path)) {
        return 'reject';
      }
      // Rearrange if rearrange is supported and active and over are siblings
      else if (Path.siblings(over.path, active.path)) {
        return graph.findNode(Path.last(Path.parent(over.path)))?.properties.onRearrangeChild ? 'rearrange' : 'reject';
      }
      // Rearrange if rearrange is supported and active is or would be a child of over
      else if (Path.hasChild(over.path, active.path)) {
        return graph.findNode(Path.last(over.path))?.properties.onRearrangeChild ? 'rearrange' : 'reject';
      }
      // Check if adopt is supported
      else {
        const overNode = graph.findNode(Path.last(over.path));
        const activeNode = graph.findNode(Path.last(active.path));
        if (overNode && activeNode && activeNode.properties.persistenceClass) {
          const activeClass = activeNode.properties.persistenceClass;
          const overAcceptParent = overNode.properties.acceptPersistenceClass?.has(activeClass)
            ? overNode
            : getPersistenceParent(overNode, activeClass);
          return overAcceptParent ? 'adopt' : 'reject';
        } else {
          return 'reject';
        }
      }
    },
    [graph],
  );

  const handleDrop = useCallback(
    ({ operation, active, over }: MosaicDropEvent<number>) => {
      const activeNode = graph.findNode(Path.last(active.path));
      const overNode = graph.findNode(Path.last(over.path));
      if (activeNode && overNode) {
        const activeClass = activeNode.properties.persistenceClass;
        const nextIndex = nextRearrangeIndex(
          activeNode.parent!.children.sort(graphNodeCompare),
          activeNode.id,
          overNode.id,
        );
        if (operation === 'rearrange') {
          activeNode.parent!.properties.onRearrangeChild(activeNode, nextIndex);
        }
        if (operation === 'adopt') {
          const destinationParent = overNode?.properties.acceptPersistenceClass?.has(activeClass)
            ? overNode
            : getPersistenceParent(overNode, activeClass);
          const originParent = getPersistenceParent(activeNode, activeClass);
          if (destinationParent && originParent) {
            // TODO(wittjosiah): Rename migrate to transfer.
            destinationParent.properties.onMigrateStartChild(activeNode, nextIndex);
            originParent.properties.onMigrateEndChild(activeNode);
          }
        }
      }
    },
    [graph],
  );

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
            <NavTree
              node={graph.root}
              current={currentPath}
              onSelect={handleSelect}
              isOver={isOver}
              onOver={handleOver}
              onDrop={handleDrop}
              compare={graphNodeCompare}
            />
          </div>
          <VersionInfo config={config} />
        </div>
      </DensityProvider>
    </ElevationProvider>
  );
};
