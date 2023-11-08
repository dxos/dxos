//
// Copyright 2023 DXOS.org
//

import { CaretDoubleLeft, GearSix } from '@phosphor-icons/react';
import React, { useCallback } from 'react';

import { LayoutAction, Surface, useIntent } from '@dxos/app-framework';
import { type Node, type Graph, isGraphNode } from '@dxos/app-graph';
import { useClient, useConfig } from '@dxos/react-client';
import { useIdentity } from '@dxos/react-client/halo';
import {
  Button,
  DensityProvider,
  ElevationProvider,
  Tooltip,
  useMediaQuery,
  useSidebars,
  useTranslation,
} from '@dxos/react-ui';
import { Path, type MosaicDropEvent, type MosaicMoveEvent } from '@dxos/react-ui-mosaic';
import {
  NavTree,
  type NavTreeContextType,
  type TreeNode,
  type NavTreeProps,
  emptyBranchDroppableId,
} from '@dxos/react-ui-navtree';
import { getSize, mx } from '@dxos/react-ui-theme';
import { arrayMove } from '@dxos/util';

import { HaloButton } from './HaloButton';
import { VersionInfo } from './VersionInfo';
import { NAVTREE_PLUGIN } from '../types';
import { getPersistenceParent } from '../util';

const getMosaicPath = (graph: Graph, id: string) => {
  const parts = graph.getPath(id)?.filter((part) => part !== 'childrenMap');
  return parts ? Path.create('root', ...parts) : undefined;
};

const trimPlaceholder = (path: string) => (Path.last(path) === emptyBranchDroppableId ? Path.parent(path) : path);

const renderPresence = (node: TreeNode) => {
  if (isGraphNode(node)) {
    return <Surface role='presence' data={{ object: node.data }} />;
  }

  return null;
};

export const TreeViewContainer = ({
  graph,
  activeId,
  popoverAnchorId,
}: {
  graph: Graph;
  activeId?: string;
  popoverAnchorId?: string;
}) => {
  const client = useClient();
  const config = useConfig();
  const identity = useIdentity();

  const { t } = useTranslation(NAVTREE_PLUGIN);
  const { navigationSidebarOpen, closeNavigationSidebar } = useSidebars(NAVTREE_PLUGIN);
  const [isLg] = useMediaQuery('lg', { ssr: false });
  const { dispatch } = useIntent();

  const handleSelect: NavTreeContextType['onSelect'] = async ({ node }: { node: TreeNode }) => {
    if (!(node as Node).data) {
      return;
    }

    await dispatch({
      action: LayoutAction.ACTIVATE,
      data: {
        id: node.id,
      },
    });

    const defaultAction = node.actions.find((action) => action.properties.disposition === 'default');
    void defaultAction?.invoke();
    !isLg && closeNavigationSidebar();
  };

  const currentPath = (activeId && getMosaicPath(graph, activeId)) ?? 'never';

  const isOver: NavTreeProps['isOver'] = ({ path, operation, activeItem, overItem }) => {
    const activeNode = activeItem && graph.findNode(Path.last(activeItem.path));
    const overNode = overItem && graph.findNode(Path.last(trimPlaceholder(overItem.path)));
    if (
      !activeNode ||
      !overNode ||
      !Path.hasRoot(overItem.path, graph.root.id) ||
      (operation !== 'transfer' && operation !== 'copy')
    ) {
      return false;
    }

    const activeClass = activeNode.properties.persistenceClass;
    if (overNode.properties.acceptPersistenceClass?.has(activeClass)) {
      return trimPlaceholder(overItem.path) === path;
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
        return graph.findNode(Path.last(Path.parent(over.path)))?.properties.onRearrangeChildren
          ? 'rearrange'
          : 'reject';
      }
      // Rearrange if rearrange is supported and active is or would be a child of over
      else if (Path.hasChild(over.path, active.path)) {
        return graph.findNode(Path.last(over.path))?.properties.onRearrangeChildren ? 'rearrange' : 'reject';
      }
      // Check if transfer is supported
      else {
        // Adjust overPath if over is empty placeholder.
        const overPath = trimPlaceholder(over.path);
        const overNode = graph.findNode(Path.last(overPath));
        const activeNode = graph.findNode(Path.last(active.path));
        if (overNode && activeNode && activeNode.properties.persistenceClass) {
          const activeClass = activeNode.properties.persistenceClass;
          const overAcceptParent = overNode.properties.acceptPersistenceClass?.has(activeClass)
            ? overNode
            : getPersistenceParent(overNode, activeClass);
          return overAcceptParent ? 'transfer' : 'reject';
        } else {
          return 'reject';
        }
      }
    },
    [graph],
  );

  const handleDrop = useCallback(
    ({ operation, active, over }: MosaicDropEvent<number>) => {
      const overPath = trimPlaceholder(over.path);
      const activeNode = graph.findNode(Path.last(active.path));
      const overNode = graph.findNode(Path.last(overPath));
      if (activeNode && overNode) {
        const activeClass = activeNode.properties.persistenceClass;
        if (operation === 'rearrange') {
          const ids = Object.keys(activeNode.parent!.childrenMap);
          const nodes = Object.values(activeNode.parent!.childrenMap).map(({ data }) => data);
          const activeIndex = ids.indexOf(activeNode.id);
          const overIndex = ids.indexOf(overNode.id);
          activeNode.parent!.properties.onRearrangeChildren(
            arrayMove(nodes, activeIndex, overIndex > -1 ? overIndex : ids.length - 1),
          );
        }
        if (operation === 'transfer') {
          const destinationParent = overNode?.properties.acceptPersistenceClass?.has(activeClass)
            ? overNode
            : getPersistenceParent(overNode, activeClass);
          const originParent = getPersistenceParent(activeNode, activeClass);
          if (destinationParent && originParent) {
            destinationParent.properties.onTransferStart(activeNode);
            originParent.properties.onTransferEnd(activeNode, destinationParent);
          }
        }
      }
    },
    [graph],
  );

  return (
    <ElevationProvider elevation='chrome'>
      <div role='none' className='flex flex-col bs-full'>
        <DensityProvider density='coarse'>
          {identity && (
            <>
              <div role='none' className='shrink-0 flex items-center gap-1 pis-3 pie-1.5 plb-1'>
                <HaloButton
                  size={6}
                  identityKey={identity?.identityKey.toHex()}
                  onClick={() => client.shell.shareIdentity()}
                />
                <div role='none' className='grow' />
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <Button
                      variant='ghost'
                      classNames='pli-2 pointer-fine:pli-1'
                      {...(!navigationSidebarOpen && { tabIndex: -1 })}
                      onClick={() => {
                        void dispatch({
                          action: LayoutAction.OPEN_DIALOG,
                          data: { component: 'dxos.org/plugin/layout/ProfileSettings' },
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
                          action: LayoutAction.TOGGLE_SIDEBAR,
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
        </DensityProvider>
        <DensityProvider density='fine'>
          <div role='none' className='grow min-bs-0 overflow-y-auto p-0.5'>
            <NavTree
              node={graph.root}
              current={currentPath}
              onSelect={handleSelect}
              isOver={isOver}
              onOver={handleOver}
              onDrop={handleDrop}
              popoverAnchorId={popoverAnchorId}
              renderPresence={renderPresence}
            />
          </div>
          <VersionInfo config={config} />
        </DensityProvider>
      </div>
    </ElevationProvider>
  );
};
