//
// Copyright 2023 DXOS.org
//

import React, { forwardRef, Fragment, useRef, useState } from 'react';

import { Tooltip, Popover, Treegrid, useTranslation, toLocalizedString, Button } from '@dxos/react-ui';
import { useMosaic, type MosaicTileComponentProps } from '@dxos/react-ui-mosaic';
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
import { INDENTATION, topLevelCollapsibleSpacing } from './navtree-fragments';
import { translationKey } from '../translations';
import type { NavTreeItemNode as NavTreeItemProps } from '../types';

const hoverableDescriptionIcons =
  '[--icons-color:inherit] hover-hover:[--icons-color:var(--description-text)] hover-hover:hover:[--icons-color:inherit] focus-within:[--icons-color:inherit]';

export const NAV_TREE_ITEM = 'NavTreeItem';

export const NavTreeItem = forwardRef<HTMLDivElement, MosaicTileComponentProps<NavTreeItemProps>>(
  (props, forwardedRef) => {
    if (props.active) {
      if (props.active === 'overlay') {
        return <NavTreeItemOverlay {...props} ref={forwardedRef} />;
      } else {
        return <NavTreeBar {...props} ref={forwardedRef} />;
      }
    } else {
      return <NavTreeItemImpl {...props} ref={forwardedRef} />;
    }
  },
);

const NavTreeItemOverlay = forwardRef<HTMLDivElement, MosaicTileComponentProps<NavTreeItemProps>>(
  ({ draggableStyle }, forwardedRef) => {
    return (
      <div
        role='none'
        className='opacity-20 bg-primary-500/50 border border-primary-500 rounded bs-[--rail-action]'
        style={draggableStyle}
        ref={forwardedRef}
      />
    );
  },
);

const NavTreeBar = forwardRef<HTMLDivElement, MosaicTileComponentProps<NavTreeItemProps>>(
  ({ path, draggableStyle }, forwardedRef) => {
    const pathParts = path.split(Treegrid.PATH_SEPARATOR);
    const pathLevel = pathParts.length - 1;
    const { moveDetails } = useMosaic();
    const level = pathLevel + ((moveDetails as { depthOffset?: number } | undefined)?.depthOffset ?? 0);
    return (
      <div
        role='none'
        ref={forwardedRef}
        className='col-[navtree-row] flex items-center bs-[--rail-action] pie-2'
        style={{ ...draggableStyle, paddingInlineStart: `${level * INDENTATION}px` }}
      >
        <div role='none' className='surface-accent is-px bs-full' />
        <div role='none' className='surface-accent bs-1 grow rounded-ie-full' />
      </div>
    );
  },
);

const NavTreeItemImpl = forwardRef<HTMLDivElement, MosaicTileComponentProps<NavTreeItemProps>>(
  ({ item, draggableProps, draggableStyle, path, active }, forwardedRef) => {
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
            'rounded relative transition-opacity grid grid-cols-subgrid col-[navtree-row]',
            hoverableControls,
            hoverableFocusedKeyboardControls,
            hoverableFocusedWithinControls,
            hoverableDescriptionIcons,
            level < 1 && topLevelCollapsibleSpacing,
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
              classNames={['pli-1.5', !isBranch && 'invisible']}
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
              branch: isBranch,
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
