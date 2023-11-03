//
// Copyright 2023 DXOS.org
//

import { DotsThreeVertical, Placeholder } from '@phosphor-icons/react';
import React, { type ForwardedRef, forwardRef, Fragment, useEffect, useState } from 'react';

import { DensityProvider, Tree, TreeItem as TreeItemComponent, TreeItem, useTranslation } from '@dxos/react-ui';
import { Mosaic, useContainer, type MosaicTileComponent, Path, useItemsWithOrigin } from '@dxos/react-ui-mosaic';
import {
  descriptionText,
  dropRing,
  fineBlockSize,
  focusRing,
  hoverableControls,
  hoverableFocusedKeyboardControls,
  hoverableFocusedWithinControls,
  mx,
} from '@dxos/react-ui-theme';

import { useNavTree } from './NavTreeContext';
import { NavTreeItemActionMenu } from './NavTreeItemAction';
import { NavTreeItemHeading } from './NavTreeItemHeading';
import { levelPadding, topLevelCollapsibleSpacing } from './navtree-fragments';
import { translationKey } from '../translations';
import type { TreeNode } from '../types';

const hoverableDescriptionIcons =
  '[--icons-color:inherit] hover-hover:[--icons-color:var(--description-text)] hover-hover:hover:[--icons-color:inherit] focus-within:[--icons-color:inherit]';

export const emptyBranchDroppableId = '__placeholder__';

const NavTreeEmptyBranch = ({ path, level }: { path: string; level: number }) => {
  const { Component } = useContainer();
  return (
    <TreeItemComponent.Body>
      <Mosaic.DroppableTile path={path} item={{ id: emptyBranchDroppableId, level }} Component={Component!} />
    </TreeItemComponent.Body>
  );
};

const NavTreeEmptyBranchPlaceholder: MosaicTileComponent<NavTreeItemData, HTMLDivElement> = forwardRef(
  ({ item: { level } }, forwardedRef) => {
    const { t } = useTranslation(translationKey);
    return (
      <div className={mx(levelPadding(level))} ref={forwardedRef}>
        <p
          className={mx(
            descriptionText,
            fineBlockSize,
            'flex items-center justify-center border border-dashed border-neutral-500/20 mlb-1 p-1 rounded',
          )}
        >
          <span>{t('empty branch message')}</span>
        </p>
      </div>
    );
  },
);

const NavTreeBranch = ({ path, nodes, level }: { path: string; nodes: TreeNode[]; level: number }) => {
  const { Component } = useContainer();

  const items = useItemsWithOrigin(path, nodes);

  return (
    <TreeItemComponent.Body>
      <Mosaic.SortableContext id={path} items={items} direction='vertical'>
        <Tree.Branch>
          {items.map((node, index) => (
            <Mosaic.SortableTile
              key={node.id}
              item={{ id: node.id, node, level }}
              path={path}
              position={index}
              Component={Component!}
            />
          ))}
        </Tree.Branch>
      </Mosaic.SortableContext>
    </TreeItemComponent.Body>
  );
};

export const NavTreeMosaicComponent: MosaicTileComponent<NavTreeItemData, HTMLLIElement> = forwardRef((props, ref) => {
  if (props.item.id.endsWith(emptyBranchDroppableId)) {
    return <NavTreeEmptyBranchPlaceholder {...props} ref={ref as ForwardedRef<HTMLDivElement>} />;
  } else {
    return <NavTreeItem {...props} ref={ref} />;
  }
});

// TODO(wittjosiah): Spread node?
export type NavTreeItemData = { id: TreeNode['id']; node: TreeNode; level: number };

export const NavTreeItem: MosaicTileComponent<NavTreeItemData, HTMLLIElement> = forwardRef(
  ({ item, draggableProps, draggableStyle, active, path, position }, forwardedRef) => {
    const { node, level } = item;
    const isBranch = node.properties?.role === 'branch' || node.children?.length > 0;

    const [primaryAction, ...secondaryActions] = [...node.actions].sort((a, b) =>
      a.properties.disposition === 'toolbar' ? -1 : 1,
    );
    const actions = primaryAction?.properties.disposition === 'toolbar' ? secondaryActions : node.actions;
    const { t } = useTranslation(translationKey);
    const { current, popoverAnchorId, onSelect, isOver } = useNavTree();
    const [open, setOpen] = useState(level < 1);

    useEffect(() => {
      if (current && Path.onPath(current, node.id)) {
        setOpen(true);
      }
    }, [current, path]);

    const disabled = !!(node.properties?.disabled ?? node.properties?.isPreview);
    const forceCollapse = active === 'overlay' || active === 'destination' || active === 'rearrange' || disabled;

    const Root = active === 'overlay' ? Tree.Root : Fragment;

    return (
      <DensityProvider density='fine'>
        <Root>
          <TreeItem.Root
            collapsible={isBranch}
            open={!forceCollapse && open}
            onOpenChange={(nextOpen) => setOpen(forceCollapse ? false : nextOpen)}
            classNames={[
              'rounded block',
              hoverableFocusedKeyboardControls,
              'transition-opacity',
              active && active !== 'overlay' && 'opacity-0',
              focusRing,
              isOver(path) && dropRing,
              level === 0 && 'mbs-4 first:mbs-0',
            ]}
            {...draggableProps}
            data-itemid={item.id}
            data-testid={node.properties.testId}
            style={draggableStyle}
            ref={forwardedRef}
            role='treeitem'
          >
            <div
              role='none'
              className={mx(
                levelPadding(level),
                hoverableControls,
                hoverableFocusedWithinControls,
                hoverableDescriptionIcons,
                level < 1 && topLevelCollapsibleSpacing,
                ((active && active !== 'overlay') || path === current) && 'bg-neutral-75 dark:bg-neutral-850',
                'flex items-start rounded',
              )}
            >
              <NavTreeItemHeading
                {...{
                  id: node.id,
                  level,
                  label: Array.isArray(node.label) ? t(...node.label) : node.label,
                  icon: node.icon,
                  open,
                  current: path === current,
                  branch: node.properties?.role === 'branch' || node.children?.length > 0,
                  disabled: !!node.properties?.disabled,
                  error: !!node.properties?.error,
                  modified: node.properties?.modified ?? false,
                  palette: node.properties?.palette,
                  onSelect: () => onSelect?.({ path, node, level, position: position as number }),
                }}
              />
              {/*
              TODO(wittjosiah): Primary action should come at the end.
              However, currently if it does then the triple dots menus don't line up for nodes without primary actions. */}
              {primaryAction?.properties.disposition === 'toolbar' && (
                <NavTreeItemActionMenu
                  id={node.id}
                  label={Array.isArray(primaryAction.label) ? t(...primaryAction.label) : primaryAction.label}
                  icon={primaryAction.icon ?? Placeholder}
                  action={primaryAction.actions.length === 0 ? primaryAction : undefined}
                  actions={primaryAction.actions}
                  level={level}
                  active={active}
                  popoverAnchorId={popoverAnchorId}
                  testId={primaryAction.properties.testId}
                />
              )}
              {actions.length > 0 && (
                <NavTreeItemActionMenu
                  id={node.id}
                  // label={t('tree item actions label')}
                  icon={DotsThreeVertical}
                  actions={actions}
                  level={level}
                  active={active}
                  popoverAnchorId={popoverAnchorId}
                  testId={`navtree.treeItem.actionsLevel${level}`}
                />
              )}
            </div>
            {!active &&
              isBranch &&
              (node.children?.length > 0 ? (
                <NavTreeBranch path={path} nodes={node.children} level={level + 1} />
              ) : (
                <NavTreeEmptyBranch path={path} level={level + 1} />
              ))}
          </TreeItem.Root>
        </Root>
      </DensityProvider>
    );
  },
);
