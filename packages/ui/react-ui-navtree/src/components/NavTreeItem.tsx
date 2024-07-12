//
// Copyright 2023 DXOS.org
//

import React, { forwardRef, Fragment, useRef, useState } from 'react';

import { Tooltip, Popover, Treegrid, useTranslation, toLocalizedString, Button } from '@dxos/react-ui';
import { type MosaicTileComponent } from '@dxos/react-ui-mosaic';
import {
  focusRing,
  getSize,
  hoverableControls,
  hoverableFocusedKeyboardControls,
  hoverableFocusedWithinControls,
  mx,
  staticGhostSelectedCurrent,
} from '@dxos/react-ui-theme';

import { useNavTree } from './NavTreeContext';
import { NavTreeItemAction, NavTreeItemActionDropdownMenu } from './NavTreeItemAction';
import { NavTreeItemHeading } from './NavTreeItemHeading';
import { topLevelCollapsibleSpacing } from './navtree-fragments';
import { translationKey } from '../translations';
import type { NavTreeItemNode as NavTreeItemProps } from '../types';

const hoverableDescriptionIcons =
  '[--icons-color:inherit] hover-hover:[--icons-color:var(--description-text)] hover-hover:hover:[--icons-color:inherit] focus-within:[--icons-color:inherit]';

export const NAV_TREE_ITEM = 'NavTreeItem';

export const NavTreeItem: MosaicTileComponent<NavTreeItemProps, HTMLDivElement> = forwardRef(
  ({ item, draggableProps, draggableStyle, path, active, position }, forwardedRef) => {
    const { id, node, path: itemPath = [], parentOf = [], actions: itemActions = [] } = item;
    const level = itemPath.length - 1;
    // const isBranch = node.properties?.role === 'branch' || parentOf.length > 0;
    const [primaryAction, ...secondaryActions] = itemActions.sort((a, b) =>
      a.properties?.disposition === 'toolbar' ? -1 : 1,
    );
    const actions = (primaryAction.properties?.disposition === 'toolbar' ? secondaryActions : itemActions)
      .flatMap((action) => ('invoke' in action ? [action] : []))
      .filter((action) => !action.properties?.hidden);

    const { t } = useTranslation(translationKey);

    const {
      current,
      attended,
      popoverAnchorId,
      onNavigate,
      onItemOpenChange,
      isOver,
      renderPresence,
      open: openRows,
    } = useNavTree();
    const isOverCurrent = isOver(path);
    const open = !!openRows?.has(id);
    const isParent = parentOf && parentOf.length > 0;

    const suppressNextTooltip = useRef<boolean>(false);
    const [tooltipOpen, setTooltipOpen] = useState<boolean>(false);
    const [menuOpen, setMenuOpen] = useState<boolean>(false);

    const disabled = !!(node.properties?.disabled ?? node.properties?.isPreview);

    // const forceCollapse = active === 'overlay' || active === 'destination' || active === 'rearrange' || disabled;

    const ActionRoot = popoverAnchorId === `dxos.org/ui/${NAV_TREE_ITEM}/${node.id}` ? Popover.Anchor : Fragment;

    const openTriggerIcon = open ? 'ph--caret-down--regular' : 'ph--caret-right--regular';

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
        <Treegrid.Row
          id={node.id}
          path={item.path?.join(Treegrid.PATH_SEPARATOR) ?? path}
          parentOf={item.parentOf?.join(Treegrid.PARENT_OF_SEPARATOR)}
          classNames={[
            'grid grid-cols-subgrid rounded relative transition-opacity',
            renderPresence ? 'col-span-5' : 'col-span-4',
            hoverableControls,
            hoverableFocusedKeyboardControls,
            hoverableFocusedWithinControls,
            hoverableDescriptionIcons,
            level < 1 && topLevelCollapsibleSpacing,
            active && active !== 'overlay' && 'opacity-0',
            !renderPresence &&
              staticGhostSelectedCurrent({ current: (active && active !== 'overlay') || current?.has(path) }),
            focusRing,
            isOverCurrent && 'z-[1]',
          ]}
          data-itemid={item.id}
          data-testid={node.properties?.testId}
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
          {...draggableProps}
          style={draggableStyle}
          role='row'
          ref={forwardedRef}
        >
          <Treegrid.Cell indent>
            <Button
              classNames={['pli-1.5', !isParent && 'invisible']}
              disabled={disabled}
              data-testid={!open ? 'navtree.treeItem.openTrigger' : 'navtree.treeItem.closeTrigger'}
              onKeyDown={(event) => {
                if (event.key === ' ' || event.key === 'Enter') {
                  event.stopPropagation();
                }
              }}
              onClick={() => onItemOpenChange?.(item, !open)}
            >
              <svg className={mx('shrink-0 text-[--icons-color]', getSize(3))}>
                <use href={`/icons.svg#${openTriggerIcon}`} />
              </svg>
            </Button>
          </Treegrid.Cell>
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
              onNavigate: () => onNavigate?.(item),
            }}
          />
          {primaryAction.properties?.disposition === 'toolbar' && 'invoke' in primaryAction ? (
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
          ) : (
            <Treegrid.Cell />
          )}
          {actions.length ? (
            <ActionRoot>
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
            </ActionRoot>
          ) : null}
          {renderPresence?.(node)}
        </Treegrid.Row>

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
