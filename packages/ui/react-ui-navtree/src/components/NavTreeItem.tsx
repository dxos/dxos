//
// Copyright 2023 DXOS.org
//

import React, { forwardRef, Fragment, useEffect, useRef, useState } from 'react';

import { Tooltip, Popover, Tree, TreeItem, useTranslation, toLocalizedString } from '@dxos/react-ui';
import { type MosaicTileComponent, Path } from '@dxos/react-ui-mosaic';
import {
  dropRing,
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
import type { NavTreeItemNode as NavTreeItemProps } from '../types';

const hoverableDescriptionIcons =
  '[--icons-color:inherit] hover-hover:[--icons-color:var(--description-text)] hover-hover:hover:[--icons-color:inherit] focus-within:[--icons-color:inherit]';

export const NAV_TREE_ITEM = 'NavTreeItem';

export const NavTreeItem: MosaicTileComponent<NavTreeItemProps, HTMLLIElement> = forwardRef(
  ({ item, draggableProps, draggableStyle, path, active, position }, forwardedRef) => {
    const { id, node, path: itemPath = [], parentOf = [], actions: itemActions = [] } = item;
    const level = itemPath.length - 1;
    const isBranch = node.properties?.role === 'branch' || parentOf.length > 0;
    const [primaryAction, ...secondaryActions] = itemActions.sort((a, b) =>
      a.properties?.disposition === 'toolbar' ? -1 : 1,
    );
    const actions = (primaryAction.properties?.disposition === 'toolbar' ? secondaryActions : itemActions)
      .flatMap((action) => ('invoke' in action ? [action] : []))
      .filter((action) => !action.properties?.hidden);
    const { t } = useTranslation(translationKey);
    const { current, attended, popoverAnchorId, onNavigate, onItemOpenChange, isOver, renderPresence } = useNavTree();
    const [open, setOpen] = useState(level < 1);
    const suppressNextTooltip = useRef<boolean>(false);
    const [tooltipOpen, setTooltipOpen] = useState<boolean>(false);
    const [menuOpen, setMenuOpen] = useState<boolean>(false);

    useEffect(() => {
      if (current && Array.from(current).find((currentMember) => Path.onPath(currentMember, node.id))) {
        setOpen(true);
      }
    }, [current, path]);

    const disabled = !!(node.properties?.disabled ?? node.properties?.isPreview);
    const forceCollapse = active === 'overlay' || active === 'destination' || active === 'rearrange' || disabled;

    const Root = active === 'overlay' ? Tree.Root : Fragment;
    const ActionRoot = popoverAnchorId === `dxos.org/ui/${NAV_TREE_ITEM}/${node.id}` ? Popover.Anchor : Fragment;

    const isOverCurrent = isOver(path);

    const handleOpenChange = (open: boolean) => {
      const nextOpen = forceCollapse ? false : open;
      setOpen(nextOpen);
      onItemOpenChange?.({ id, path: itemPath, node, position: position as number, open: nextOpen });
    };

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
        <Root>
          <TreeItem.Root
            collapsible={isBranch}
            open={!forceCollapse && open}
            onOpenChange={handleOpenChange}
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
            data-testid={node.properties?.testId}
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
                  hoverableControls,
                  hoverableFocusedWithinControls,
                  hoverableDescriptionIcons,
                  level < 1 && topLevelCollapsibleSpacing,
                  !renderPresence &&
                    staticGhostSelectedCurrent({ current: (active && active !== 'overlay') || current?.has(path) }),
                )}
                {
                  // NOTE(thure): This is intentionally an empty string to for descendents to select by in the CSS
                  //   without alerting the user (except for in the correct link element). See also:
                  //   https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-current#description
                  ...(current?.has(path) && {
                    'aria-current': '' as 'page',
                    'data-attention': attended?.has(node.id) ?? false,
                  })
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
                    label: node.properties ? toLocalizedString(node.properties.label, t) : 'never',
                    iconSymbol: node.properties?.iconSymbol,
                    open,
                    onItemOpenChange,
                    current: current?.has(path),
                    branch: node.properties?.role === 'branch' || parentOf.length > 0,
                    disabled: !!node.properties?.disabled,
                    error: !!node.properties?.error,
                    modified: node.properties?.modified ?? false,
                    palette: node.properties?.palette,
                    onNavigate: () => onNavigate?.({ id, path: itemPath, node, position: position as number }),
                  }}
                />
                {primaryAction.properties?.disposition === 'toolbar' && 'invoke' in primaryAction && (
                  <NavTreeItemAction
                    label={toLocalizedString(primaryAction.properties?.label, t)}
                    iconSymbol={primaryAction.properties?.iconSymbol ?? 'ph--placeholder--regular'}
                    menuActions={[primaryAction]}
                    active={active}
                    testId={primaryAction.properties?.testId}
                    menuType={primaryAction.properties?.menuType}
                    suppressNextTooltip={suppressNextTooltip}
                    caller={NAV_TREE_ITEM}
                  />
                )}
                {actions.length ? (
                  <NavTreeItemActionDropdownMenu
                    label={t('tree item actions label')}
                    iconSymbol='ph--dots-three-vertical--regular'
                    menuActions={actions}
                    suppressNextTooltip={suppressNextTooltip}
                    onAction={(action) => action.invoke?.({ caller: NAV_TREE_ITEM })}
                    testId={`navtree.treeItem.actionsLevel${level}`}
                    menuOpen={menuOpen}
                    onChangeMenuOpen={setMenuOpen}
                  />
                ) : null}
                {renderPresence?.(node)}
              </div>
            </ActionRoot>
          </TreeItem.Root>
        </Root>

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
