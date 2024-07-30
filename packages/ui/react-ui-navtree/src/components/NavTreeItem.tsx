//
// Copyright 2023 DXOS.org
//

import React, { forwardRef, Fragment, useRef, useState } from 'react';

import { Tooltip, Popover, Treegrid, useTranslation, toLocalizedString, Button } from '@dxos/react-ui';
import { type MosaicTileComponentProps, useMosaic } from '@dxos/react-ui-mosaic';
import {
  focusRing,
  getSize,
  hoverableControls,
  hoverableFocusedKeyboardControls,
  hoverableFocusedWithinControls,
  mx,
} from '@dxos/react-ui-theme';

import { useNavTree } from './NavTreeContext';
import { NavTreeItemAction, NavTreeItemActionDropdownMenu } from './NavTreeItemAction';
import { NavTreeItemHeading } from './NavTreeItemHeading';
import { topLevelCollapsibleSpacing } from './navtree-fragments';
import { translationKey } from '../translations';
import type { NavTreeActionNode, NavTreeItemNode as NavTreeItemProps } from '../types';
import { getLevel } from '../util';

const hoverableDescriptionIcons =
  '[--icons-color:inherit] hover-hover:[--icons-color:var(--description-text)] hover-hover:hover:[--icons-color:inherit] focus-within:[--icons-color:inherit]';

export const NAV_TREE_ITEM = 'NavTreeItem';

export const NavTreeItem = forwardRef<HTMLDivElement, MosaicTileComponentProps<NavTreeItemProps>>(
  (props, forwardedRef) => {
    if (props.active && props.active === 'overlay') {
      return null;
    } else {
      return <NavTreeItemImpl {...props} ref={forwardedRef} />;
    }
  },
);

const isAction = (o: unknown): o is NavTreeActionNode =>
  typeof o === 'object' && !!o && 'data' in o && typeof o.data === 'function';

const NavTreeItemImpl = forwardRef<HTMLDivElement, MosaicTileComponentProps<NavTreeItemProps>>(
  ({ item, draggableProps, draggableStyle, path, active }, forwardedRef) => {
    const { id, node, parentOf = [], actions: itemActions = [] } = item;
    const isBranch = node.properties?.role === 'branch' || parentOf.length > 0;

    const [primaryAction, ...secondaryActions] = itemActions.sort((a, b) =>
      a.properties?.disposition === 'toolbar' ? -1 : 1,
    );

    const actions = (primaryAction?.properties?.disposition === 'toolbar' ? secondaryActions : itemActions)
      .flatMap((action) => (isAction(action) ? [action] : []))
      .filter((action) => !action.properties?.hidden);

    const { t } = useTranslation(translationKey);

    const {
      current,
      attended,
      popoverAnchorId,
      onNavigate,
      onItemOpenChange,
      renderPresence,
      open: openRows,
      indentation,
      resolveItemLevel,
    } = useNavTree();

    const open = !!openRows?.has(id);

    const { overItem, activeItem, moveDetails } = useMosaic();

    const level = active
      ? resolveItemLevel?.(
          overItem?.position as number,
          activeItem?.item.id,
          (moveDetails as { levelOffset?: number } | undefined)?.levelOffset ?? 0,
        ) ?? 1
      : getLevel(item.path);

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
          id={id}
          parentOf={item.parentOf?.join(Treegrid.PARENT_OF_SEPARATOR)}
          classNames={[
            'rounded relative transition-opacity grid grid-cols-subgrid col-[navtree-row] select-none',
            hoverableControls,
            hoverableFocusedKeyboardControls,
            hoverableFocusedWithinControls,
            hoverableDescriptionIcons,
            level < 1 && topLevelCollapsibleSpacing,
            focusRing,
          ]}
          data-itemid={item.id}
          data-testid={node.properties?.testId}
          {
            // NOTE(thure): This is intentionally an empty string to for descendents to select by in the CSS
            //   without alerting the user (except for in the correct link element). See also:
            //   https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-current#description
            ...(current?.has(node.id) && {
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
          <Treegrid.Cell
            classNames={[
              'flex items-center bg-clip-content rounded-sm',
              itemActions.length < 1 && 'col-span-2',
              active && active !== 'overlay' && 'bg-primary-500/20',
            ]}
            style={indentation?.(level)}
          >
            <Button
              variant='ghost'
              density='fine'
              classNames={['!pli-1', !isBranch && 'invisible']}
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
            <NavTreeItemHeading
              {...{
                id: node.id,
                level,
                label: node.properties ? toLocalizedString(node.properties.label, t) : 'never',
                iconSymbol: node.properties?.iconSymbol,
                open,
                onItemOpenChange,
                current: current?.has(node.id),
                branch: isBranch,
                disabled: !!node.properties?.disabled,
                error: !!node.properties?.error,
                modified: node.properties?.modified ?? false,
                palette: node.properties?.palette,
                onNavigate: () => onNavigate?.(item),
              }}
            />
          </Treegrid.Cell>
          {!active && primaryAction?.properties?.disposition === 'toolbar' ? (
            <NavTreeItemAction
              label={toLocalizedString(primaryAction.properties?.label, t)}
              iconSymbol={primaryAction.properties?.iconSymbol ?? 'ph--placeholder--regular'}
              actionsNode={primaryAction}
              menuActions={isAction(primaryAction) ? [primaryAction] : item.groupedActions?.[primaryAction.id]}
              active={active}
              testId={primaryAction.properties?.testId}
              menuType={primaryAction.properties?.menuType}
              suppressNextTooltip={suppressNextTooltip}
              caller={NAV_TREE_ITEM}
            />
          ) : (
            <Treegrid.Cell />
          )}
          {!active && actions.length > 0 && (
            <ActionRoot>
              <NavTreeItemActionDropdownMenu
                label={t('tree item actions label')}
                iconSymbol='ph--dots-three-vertical--regular'
                actionsNode={primaryAction}
                menuActions={actions}
                suppressNextTooltip={suppressNextTooltip}
                onAction={(action) => action.data?.({ caller: NAV_TREE_ITEM })}
                testId={`navtree.treeItem.actionsLevel${level}`}
                menuOpen={menuOpen}
                onChangeMenuOpen={setMenuOpen}
              />
            </ActionRoot>
          )}
          {!active && renderPresence?.(node)}
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
