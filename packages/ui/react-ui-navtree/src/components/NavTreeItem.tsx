//
// Copyright 2023 DXOS.org
//

import { DotsThreeVertical, Placeholder } from '@phosphor-icons/react';
import React, { type ForwardedRef, forwardRef, Fragment, useEffect, useRef, useState } from 'react';

import {
  Tooltip,
  Popover,
  Tree,
  TreeItem as TreeItemComponent,
  TreeItem,
  useTranslation,
  DensityProvider,
  toLocalizedString,
} from '@dxos/react-ui';
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
  staticGhostSelectedCurrent,
} from '@dxos/react-ui-theme';

import { useNavTree } from './NavTreeContext';
import { NavTreeItemAction, NavTreeItemActionDropdownMenu } from './NavTreeItemAction';
import { NavTreeItemHeading } from './NavTreeItemHeading';
import { levelPadding, topLevelCollapsibleSpacing } from './navtree-fragments';
import { translationKey } from '../translations';
import type { TreeNode } from '../types';

const hoverableDescriptionIcons =
  '[--icons-color:inherit] hover-hover:[--icons-color:var(--description-text)] hover-hover:hover:[--icons-color:inherit] focus-within:[--icons-color:inherit]';

export const emptyBranchDroppableId = '__placeholder__';

const NavTreeEmptyBranch = ({ path, level }: { path: string; level: number }) => {
  const { Component, type } = useContainer();
  return (
    <TreeItemComponent.Body>
      <Mosaic.DroppableTile
        path={path}
        type={type}
        item={{ id: emptyBranchDroppableId, level }}
        Component={Component!}
      />
    </TreeItemComponent.Body>
  );
};

const NavTreeEmptyBranchPlaceholder: MosaicTileComponent<NavTreeItemData, HTMLDivElement> = forwardRef(
  ({ item: { level } }, forwardedRef) => {
    const { t } = useTranslation(translationKey);
    return (
      <div className={mx(levelPadding(level), fineBlockSize, 'pie-1 flex items-center')} ref={forwardedRef}>
        <p
          className={mx(descriptionText, 'grow border border-dashed border-neutral-500/20 p-1 text-center rounded-sm')}
        >
          <span>{t('empty branch message')}</span>
        </p>
      </div>
    );
  },
);

const NavTreeBranch = ({ path, nodes, level }: { path: string; nodes: TreeNode[]; level: number }) => {
  const { Component, type } = useContainer();

  const items = useItemsWithOrigin(path, nodes);

  return (
    <TreeItemComponent.Body>
      <Mosaic.SortableContext id={path} items={items} direction='vertical'>
        <Tree.Branch>
          {items.map((node, index) => (
            <Mosaic.SortableTile
              key={node.id}
              item={{ ...node, level }}
              path={path}
              type={type}
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

export type NavTreeItemData = TreeNode & { level: number };

export const NAV_TREE_ITEM = 'NavTreeItem';

export const NavTreeItem: MosaicTileComponent<NavTreeItemData, HTMLLIElement> = forwardRef(
  ({ item, draggableProps, draggableStyle, active, path, position }, forwardedRef) => {
    const { level, ...node } = item;
    const isBranch = node.properties?.role === 'branch' || node.children?.length > 0;
    const [primaryAction, ...secondaryActions] = [...node.actions].sort((a, b) =>
      a.properties.disposition === 'toolbar' ? -1 : 1,
    );
    const actions = (primaryAction?.properties.disposition === 'toolbar' ? secondaryActions : node.actions).flatMap(
      (action) => ('invoke' in action ? [action] : []),
    );
    const { t } = useTranslation(translationKey);
    const { current, popoverAnchorId, onSelect, isOver, renderPresence } = useNavTree();
    const [open, setOpen] = useState(level < 1);
    const suppressNextTooltip = useRef<boolean>(false);
    const [tooltipOpen, setTooltipOpen] = useState<boolean>(false);
    const [menuOpen, setMenuOpen] = useState<boolean>(false);

    useEffect(() => {
      if (current && Path.onPath(current, node.id)) {
        setOpen(true);
      }
    }, [current, path]);

    const disabled = !!(node.properties?.disabled ?? node.properties?.isPreview);
    const forceCollapse = active === 'overlay' || active === 'destination' || active === 'rearrange' || disabled;

    const Root = active === 'overlay' ? Tree.Root : Fragment;
    const ActionRoot = popoverAnchorId === `dxos.org/ui/${NAV_TREE_ITEM}/${node.id}` ? Popover.Anchor : Fragment;

    const isOverCurrent = isOver(path);

    return (
      <Tooltip.Root
        open={tooltipOpen}
        onOpenChange={(nextOpen) => {
          if (nextOpen && suppressNextTooltip.current) {
            suppressNextTooltip.current = false;
            return setTooltipOpen(false);
          } else {
            return setTooltipOpen(nextOpen);
          }
        }}
      >
        <DensityProvider density='fine'>
          <Root>
            <TreeItem.Root
              collapsible={isBranch}
              open={!forceCollapse && open}
              onOpenChange={(nextOpen) => setOpen(forceCollapse ? false : nextOpen)}
              classNames={[
                'rounded block relative transition-opacity',
                hoverableFocusedKeyboardControls,
                active && active !== 'overlay' && 'opacity-0',
                focusRing,
                isOverCurrent && dropRing,
                isOverCurrent && 'z-[1]',
                level === 0 && 'mbs-4 first:mbs-0',
              ]}
              {...draggableProps}
              data-itemid={item.id}
              data-testid={node.properties.testId}
              style={draggableStyle}
              ref={forwardedRef}
              role='treeitem'
            >
              <ActionRoot>
                <div
                  role='none'
                  className={mx(
                    'flex items-start rounded',
                    levelPadding(level),
                    level > 0 && hoverableControls,
                    hoverableFocusedWithinControls,
                    hoverableDescriptionIcons,
                    level < 1 && topLevelCollapsibleSpacing,
                    !renderPresence &&
                      staticGhostSelectedCurrent({ current: (active && active !== 'overlay') || path === current }),
                  )}
                  {
                    // NOTE(thure): This is intentionally an empty string to for descendents to select by in the CSS
                    //   without alerting the user (except for in the correct link element). See also:
                    //   https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-current#description
                    ...(path === current && { 'aria-current': '' as 'page', 'data-attention': true })
                  }
                  onContextMenu={(event) => {
                    event.preventDefault();
                    setMenuOpen(true);
                  }}
                >
                  <NavTreeItemHeading
                    {...{
                      id: node.id,
                      level,
                      label: toLocalizedString(node.label, t),
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
                  {primaryAction?.properties.disposition === 'toolbar' && (
                    <NavTreeItemAction
                      label={toLocalizedString(primaryAction.label, t)}
                      icon={primaryAction.icon ?? Placeholder}
                      action={'invoke' in primaryAction ? primaryAction : undefined}
                      actions={
                        'actions' in primaryAction
                          ? primaryAction.actions.flatMap((action) => ('invoke' in action ? [action] : []))
                          : []
                      }
                      active={active}
                      testId={primaryAction.properties.testId}
                      menuType={primaryAction.properties.menuType}
                      caller={NAV_TREE_ITEM}
                    />
                  )}
                  <NavTreeItemActionDropdownMenu
                    icon={DotsThreeVertical}
                    actions={actions}
                    suppressNextTooltip={suppressNextTooltip}
                    onAction={(action) => action.invoke?.({ caller: NAV_TREE_ITEM })}
                    testId={`navtree.treeItem.actionsLevel${level}`}
                    menuOpen={menuOpen}
                    onChangeMenuOpen={setMenuOpen}
                  />
                  {renderPresence?.(node)}
                </div>
              </ActionRoot>
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

        <Tooltip.Portal>
          <Tooltip.Content side='bottom' classNames='z-[12]'>
            {t('tree item actions label')}
            <Tooltip.Arrow />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    );
  },
);
