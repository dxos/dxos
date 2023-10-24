//
// Copyright 2023 DXOS.org
//

import { DotsThreeVertical } from '@phosphor-icons/react';
import React, { forwardRef, Fragment, useEffect, useRef, useState } from 'react';

import { keyString } from '@braneframe/plugin-graph';
import {
  Button,
  DensityProvider,
  DropdownMenu,
  Popover,
  Tooltip,
  Tree,
  TreeItem as TreeItemComponent,
  TreeItem,
  useTranslation,
} from '@dxos/react-ui';
import { Mosaic, useContainer, type MosaicTileComponent, Path, useItemsWithPreview } from '@dxos/react-ui-mosaic';
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
} from '@dxos/react-ui-theme';

import { useNavTree } from './NavTreeContext';
import { NavTreeItemHeading } from './NavTreeItemHeading';
import { levelPadding, topLevelCollapsibleSpacing } from './navtree-fragments';
import { translationKey } from '../translations';
import type { TreeNode, TreeNodeAction } from '../types';

const hoverableDescriptionIcons =
  '[--icons-color:inherit] hover-hover:[--icons-color:var(--description-text)] hover-hover:hover:[--icons-color:inherit] focus-within:[--icons-color:inherit]';

const NavTreeBranch = ({ path, nodes, level }: { path: string; nodes: TreeNode[]; level: number }) => {
  const { Component, compare } = useContainer();
  const sortedNodes = useItemsWithPreview({ path, items: nodes, strategy: 'layout-stable', compare });

  return (
    <TreeItemComponent.Body>
      <Mosaic.SortableContext id={path} items={sortedNodes} direction='vertical'>
        <Tree.Branch>
          {sortedNodes.map((node, index) => (
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

// TODO(wittjosiah): Spread node?
export type NavTreeItemData = { id: TreeNode['id']; node: TreeNode; level: number };

export const NavTreeItem: MosaicTileComponent<NavTreeItemData, HTMLLIElement> = forwardRef(
  ({ item, draggableProps, draggableStyle, operation, active, path, position }, forwardedRef) => {
    const { node, level } = item;
    const isBranch = node.properties?.role === 'branch' || node.children?.length > 0;

    const actions = node.actions ?? [];
    const { t } = useTranslation(translationKey);
    const { current, popoverAnchorId, onSelect, isOver } = useNavTree();

    const suppressNextTooltip = useRef<boolean>(false);
    const [optionsTooltipOpen, setOptionsTooltipOpen] = useState(false);
    const [optionsMenuOpen, setOptionsMenuOpen] = useState(false);

    const [open, setOpen] = useState(level < 1);

    useEffect(() => {
      if (current && Path.onPath(current, node.id)) {
        setOpen(true);
      }
    }, [current, path]);

    const disabled = !!(node.properties?.disabled ?? node.properties?.isPreview);
    const forceCollapse = active === 'overlay' || active === 'destination' || active === 'rearrange' || disabled;
    const testId = node.properties?.['data-testid'];

    const Root = active === 'overlay' ? Tree.Root : Fragment;

    const ActionRoot = popoverAnchorId === `dxos.org/ui/navtree/${node.id}` ? Popover.Anchor : Fragment;

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
              data-testid={testId}
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
              {actionGroups.length > 0 && (
                <ActionRoot>
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
                        {t('tree item options label')}
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
                            data-testid={`navTree.treeItemActionsLevel${level}`}
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
                </ActionRoot>
              )}
            </div>
            {!active && isBranch && <NavTreeBranch path={path} nodes={node.children} level={level + 1} />}
          </TreeItem.Root>
        </Root>
      </DensityProvider>
    );
  },
);
