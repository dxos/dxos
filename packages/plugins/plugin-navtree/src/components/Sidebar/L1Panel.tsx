//
// Copyright 2025 DXOS.org
//

import * as Option from 'effect/Option';
import React, { memo, useCallback, useMemo } from 'react';

import { Node } from '@dxos/app-graph';
import { Paths } from '@dxos/app-toolkit';
import { useAppGraph } from '@dxos/app-toolkit/ui';
import { Graph, useActionRunner, useEdges } from '@dxos/plugin-graph';
import { DensityProvider, IconButton, ScrollArea, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { Tree } from '@dxos/react-ui-list';
import { type MenuItem, Menu } from '@dxos/react-ui-menu';
import { Tabs } from '@dxos/react-ui-tabs';
import { hoverableControlItem, hoverableOpenControlItem } from '@dxos/ui-theme';

import { getListActions, useActions, useLoadDescendents } from '#hooks';
import { meta } from '#meta';

import { NAV_TREE_ITEM } from '../NavTree';
import { useNavTreeContext } from '../NavTreeContext';
import { NavTreeItemColumns } from '../NavTreeItem/NavTreeItemColumns';

export type L1PanelProps = {
  open?: boolean;
  path: string[];
  item: Node.Node;
  isCurrent: boolean;
  onBack?: () => void;
};

/**
 * Space or settings panel.
 */
const L1Panel$ = ({ open, path, item, isCurrent, onBack }: L1PanelProps) => {
  const { t } = useTranslation(meta.profile.key);
  const title = toLocalizedString(item.properties.label, t);
  const isActivated = useIsActivatedWorkspace(item);
  const shouldRenderContent = isCurrent || isActivated;

  return (
    <Tabs.Panel
      key={item.id}
      value={item.id}
      classNames={[
        'absolute inset-y-0 end-0',
        'w-[calc(100%-var(--dx-l0-size))] lg:w-(--dx-l1-size) grid-cols-1 grid-rows-[var(--dx-rail-size)_1fr]',
        'py-[env(safe-area-inset-top)]',
        isCurrent && 'grid',
      ]}
      tabIndex={-1}
      aria-label={title}
      {...(isCurrent && { 'data-testid': 'navtree.workspace.visible' })}
      {...(!open && { inert: true })}
    >
      {shouldRenderContent && <L1PanelContent open={open} path={path} item={item} onBack={onBack} />}
    </Tabs.Panel>
  );
};

/** Determines whether a workspace tab has been populated with real child content (i.e. expanded at least once). */
const useIsActivatedWorkspace = (item: Node.Node): boolean => {
  const { graph } = useAppGraph();
  const edges = useEdges(graph, item.id);

  return useMemo(() => {
    const childIds = edges[Graph.relationKey('child')] ?? [];
    return childIds.some((childId) => {
      const child = Graph.getNode(graph, childId);
      if (Option.isNone(child)) {
        return false;
      }
      return child.value.properties.disposition === undefined;
    });
  }, [edges, graph]);
};

/**
 * Mounted panel content for active or previously-visited tabs.
 */
const L1PanelContent = ({ path, item, onBack }: Pick<L1PanelProps, 'open' | 'path' | 'item' | 'onBack'>) => {
  const navTreeContext = useNavTreeContext();

  return (
    <DensityProvider density='md'>
      <L1PanelHeader path={path} item={item} onBack={onBack} />
      <ScrollArea.Root thin orientation='vertical'>
        <ScrollArea.Viewport>
          <Tree
            classNames='pt-[2px]'
            model={navTreeContext.model}
            id={item.id}
            rootId={item.id}
            path={path}
            levelOffset={5}
            draggable
            gridTemplateColumns='[tree-row-start] minmax(0, 1fr) min-content min-content [tree-row-end]'
            renderColumns={NavTreeItemColumns}
            blockInstruction={navTreeContext.blockInstruction}
            canDrop={navTreeContext.canDrop}
            canSelect={navTreeContext.canSelect}
            onOpenChange={navTreeContext.onOpenChange}
            onSelect={navTreeContext.onSelect}
            onItemHover={navTreeContext.onItemHover}
          />
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    </DensityProvider>
  );
};

/**
 * Header row.
 */
const L1PanelHeader = ({ item, path, onBack }: Pick<L1PanelProps, 'item' | 'path' | 'onBack'>) => {
  const { t } = useTranslation(meta.profile.key);
  const { renderItemEnd: ItemEnd } = useNavTreeContext();
  const title = toLocalizedString(item.properties.label, t);
  const backCapableWorkspace = Paths.isPinnedWorkspace(item.id);

  const { menuActions, onAction } = useL1MenuActions({ item, path });
  useLoadDescendents(item);

  return (
    <div
      data-tauri-drag-region
      className='grid grid-cols-[28px_1fr_min-content_min-content] w-full items-center dx-app-drag dx-density-lg'
    >
      {backCapableWorkspace ? (
        <IconButton
          classNames={[hoverableControlItem, hoverableOpenControlItem]}
          variant='ghost'
          icon='ph--caret-left--regular'
          iconOnly
          size={4}
          label={t('button-back.button')}
          data-testid='treeView.primaryTreeButton'
          onClick={() => onBack?.()}
        />
      ) : (
        <div />
      )}
      <h2 data-tauri-drag-region className='flex-1 truncate min-w-0'>
        {title}
      </h2>
      <div className='contents dx-app-no-drag'>
        <MenuActions item={item} menuActions={menuActions} onAction={onAction} />
        {ItemEnd && <ItemEnd node={item} open />}
      </div>
    </div>
  );
};

type L1MenuActions = {
  menuActions: Node.Action[];
  onAction: (action: Node.Action, params?: Node.InvokeProps) => void;
};

/**
 * Header menu actions for an L1 workspace tab. Renders nothing for an empty
 * `menuActions`, a single inline icon button for one action, and a
 * `…`-menu trigger for multiple.
 */
const MenuActions = ({
  item,
  menuActions,
  onAction,
}: {
  item: Node.Node;
} & Pick<L1MenuActions, 'menuActions' | 'onAction'>) => {
  const { t } = useTranslation(meta.profile.key);

  if (menuActions.length === 0) {
    return null;
  }

  if (menuActions.length === 1) {
    return (
      <IconButton
        classNames={['shrink-0 px-2 pointer-fine:px-1', hoverableControlItem, hoverableOpenControlItem]}
        variant='ghost'
        icon={menuActions[0].properties?.icon ?? 'ph--circle-dashed--regular'}
        iconOnly
        size={4}
        label={toLocalizedString(menuActions[0].properties?.label, t)}
        data-testid={menuActions[0].properties?.testId}
        onClick={() => onAction(menuActions[0] as Node.Action)}
      />
    );
  }

  return (
    <Menu.Root caller={NAV_TREE_ITEM} onAction={onAction}>
      <Menu.Trigger asChild>
        <IconButton
          classNames={['shrink-0 px-2 pointer-fine:px-1', hoverableControlItem, hoverableOpenControlItem]}
          variant='ghost'
          icon='ph--dots-three-vertical--regular'
          iconOnly
          size={4}
          label={t('tree-item-actions.label')}
          data-testid='navtree.treeItem.actionsLevel0'
        />
      </Menu.Trigger>
      <Menu.Content group={item} items={menuActions as MenuItem[]} />
    </Menu.Root>
  );
};

/**
 * Builds the menu actions for the L1 panel header.
 */
const useL1MenuActions = ({ item, path }: Pick<L1PanelProps, 'item' | 'path'>): L1MenuActions => {
  const runAction = useActionRunner();

  const menuActions = getListActions(useActions(item));

  const onAction = useCallback(
    (action: Node.Action, params?: Node.InvokeProps) => {
      void runAction(action, { ...params, path });
    },
    [runAction, path],
  );

  return { menuActions, onAction };
};

export const L1Panel = memo(L1Panel$);
