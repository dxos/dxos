//
// Copyright 2023 DXOS.org
//

import { DotsThreeVertical } from '@phosphor-icons/react';
import React, { forwardRef, Fragment, useRef, useState } from 'react';

import { keyString } from '@braneframe/plugin-graph';
import {
  Button,
  DensityProvider,
  DropdownMenu,
  Tooltip,
  Tree as TreeComponent,
  TreeItem as TreeItemComponent,
  TreeItem,
  useSidebars,
  useTranslation,
} from '@dxos/aurora';
import { Mosaic, useContainer, useSortedItems, useMosaic, type MosaicTileComponent } from '@dxos/aurora-grid/next';
import {
  dropRing,
  focusRing,
  getSize,
  hoverableControlItem,
  hoverableControls,
  hoverableFocusedKeyboardControls,
  hoverableFocusedWithinControls,
  hoverableOpenControlItem,
  mx,
} from '@dxos/aurora-theme';

import { NavTreeItemHeading } from './NavTreeItemHeading';
import { levelPadding, topLevelCollapsibleSpacing } from './navtree-fragments';
import { type NavTreeItemData, type TreeNode, type TreeNodeAction } from './props';
import { translationKey } from '../translations';

const hoverableDescriptionIcons =
  '[--icons-color:inherit] hover-hover:[--icons-color:var(--description-text)] hover-hover:hover:[--icons-color:inherit] focus-within:[--icons-color:inherit]';

const NavTreeBranch = ({ path, items }: { path: string; items: TreeNode[] }) => {
  const { Component } = useContainer();
  const sortedItems = useSortedItems(items);

  return (
    <TreeItemComponent.Body>
      <Mosaic.SortableContext id={path} items={sortedItems} direction='vertical'>
        {sortedItems.map((child, index) => (
          <TreeComponent.Branch key={child.id}>
            <TreeItemComponent.Root collapsible>
              <Mosaic.SortableTile item={child} path={path} position={index} Component={Component!} />
            </TreeItemComponent.Root>
          </TreeComponent.Branch>
        ))}
      </Mosaic.SortableContext>
    </TreeItemComponent.Body>
  );
};

export const NavTreeItem: MosaicTileComponent<NavTreeItemData, HTMLLIElement> = forwardRef(
  ({ item: node, draggableProps, draggableStyle, operation, active, path }, forwardedRef) => {
    const { overItem } = useMosaic();
    const level = node.level;
    const isBranch = node.properties?.role === 'branch' || node.children.length > 0;
    const isOver = overItem?.path === path && (operation === 'adopt' || operation === 'copy');

    const actions = node.actions;
    const { t } = useTranslation(translationKey);
    const { navigationSidebarOpen } = useSidebars();

    const suppressNextTooltip = useRef<boolean>(false);
    const [optionsTooltipOpen, setOptionsTooltipOpen] = useState(false);
    const [optionsMenuOpen, setOptionsMenuOpen] = useState(false);

    const [open, setOpen] = useState(node.level < 1);

    const disabled = !!(node.properties?.disabled ?? node.properties?.isPreview);
    const forceCollapse = active === 'overlay' || active === 'destination' || active === 'rearrange' || disabled;
    const testId = node.properties?.['data-testid'];

    // TODO(burdon): Factor out heuristic to group actions.
    const actionGroups =
      level === 1
        ? actions.reduce<{ id: string; actions: TreeNodeAction[] }[]>((groups, action) => {
            const id = action.id.split(/[/-]/).at(-1)!;
            let group = groups.find((group) => group.id === id);
            if (!group) {
              group = { id, actions: [] };
              groups.push(group);
            }
            group.actions.push(action);
            return groups;
          }, [])
        : [{ id: '', actions }];

    return (
      <DensityProvider density='fine'>
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
            isOver && dropRing,
            level === 0 && 'mbs-4 first:mbs-0',
          ]}
          {...draggableProps}
          style={draggableStyle}
          ref={forwardedRef}
        >
          <div
            role='none'
            className={mx(
              levelPadding(level),
              hoverableControls,
              hoverableFocusedWithinControls,
              hoverableDescriptionIcons,
              level < 1 && topLevelCollapsibleSpacing,
              active && active !== 'overlay' && 'bg-neutral-75 dark:bg-neutral-850',
              'flex items-start rounded',
            )}
            data-testid={testId}
          >
            <NavTreeItemHeading {...{ open, node }} />
            {actionGroups.length > 0 && (
              <Tooltip.Root
                open={optionsTooltipOpen}
                onOpenChange={(nextOpen) => {
                  if (suppressNextTooltip.current) {
                    setOptionsTooltipOpen(false);
                    suppressNextTooltip.current = false;
                  } else {
                    setOptionsTooltipOpen(nextOpen);
                  }
                }}
              >
                <Tooltip.Portal>
                  <Tooltip.Content classNames='z-[31]' side='bottom'>
                    {t('tree branch options label')}
                    <Tooltip.Arrow />
                  </Tooltip.Content>
                </Tooltip.Portal>
                <DropdownMenu.Root
                  {...{
                    open: optionsMenuOpen,
                    onOpenChange: (nextOpen: boolean) => {
                      if (!nextOpen) {
                        suppressNextTooltip.current = true;
                      }
                      return setOptionsMenuOpen(nextOpen);
                    },
                  }}
                >
                  <DropdownMenu.Trigger asChild>
                    <Tooltip.Trigger asChild>
                      <Button
                        variant='ghost'
                        classNames={[
                          'shrink-0 pli-2 pointer-fine:pli-1',
                          hoverableControlItem,
                          hoverableOpenControlItem,
                          active === 'overlay' && 'invisible',
                        ]}
                        data-testid={`spacePlugin.spaceTreeItemActionsLevel${level}`}
                        {...(!navigationSidebarOpen && { tabIndex: -1 })}
                      >
                        <DotsThreeVertical className={getSize(4)} />
                      </Button>
                    </Tooltip.Trigger>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content classNames='z-[31]'>
                      <DropdownMenu.Viewport>
                        {actionGroups.map(({ id, actions }, i) => (
                          <Fragment key={id}>
                            {actions.map((action) => (
                              <DropdownMenu.Item
                                key={action.id}
                                onClick={(event) => {
                                  if (action.properties.disabled) {
                                    return;
                                  }
                                  event.stopPropagation();
                                  // TODO(thure): Why does Dialog’s modal-ness cause issues if we don’t explicitly close the menu here?
                                  suppressNextTooltip.current = true;
                                  setOptionsMenuOpen(false);
                                  void action.invoke();
                                }}
                                classNames='gap-2'
                                disabled={action.properties.disabled}
                                {...(action.properties?.testId && { 'data-testid': action.properties.testId })}
                              >
                                {action.icon && (
                                  <div className='shrink-0'>
                                    <action.icon className={getSize(4)} />
                                  </div>
                                )}
                                <div className='grow truncate'>
                                  {Array.isArray(action.label) ? t(...action.label) : action.label}
                                </div>
                                {action.keyBinding && (
                                  <div className='shrink-0 opacity-50'>{keyString(action.keyBinding)}</div>
                                )}
                              </DropdownMenu.Item>
                            ))}
                            {i < actionGroups.length - 1 && <DropdownMenu.Separator />}
                          </Fragment>
                        ))}
                      </DropdownMenu.Viewport>
                      <DropdownMenu.Arrow />
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              </Tooltip.Root>
            )}
          </div>
          {!active && node.children && <NavTreeBranch path={path} items={node.children} />}
        </TreeItem.Root>
      </DensityProvider>
    );
  },
);
