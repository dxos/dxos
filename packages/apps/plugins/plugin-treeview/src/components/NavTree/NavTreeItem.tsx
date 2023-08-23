//
// Copyright 2023 DXOS.org
//

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DotsThreeVertical } from '@phosphor-icons/react';
import React, { FC, forwardRef, ForwardRefExoticComponent, RefAttributes, useEffect, useRef, useState } from 'react';

import { SortableProps } from '@braneframe/plugin-dnd';
import { Graph } from '@braneframe/plugin-graph';
import { Button, DropdownMenu, Tooltip, TreeItem, useSidebars, useTranslation } from '@dxos/aurora';
import { focusRing, getSize, groupSurface, mx } from '@dxos/aurora-theme';

import { useTreeView } from '../../TreeViewContext';
import { SharedTreeItemProps, TREE_VIEW_PLUGIN } from '../../types';
import { sortActions } from '../../util';
import { CollapsibleHeading } from './CollapsibleHeading';
import { NavTree } from './NavTree';
import { NavigableHeading } from './NavigableHeading';
import { levelPadding } from './navtree-fragments';

type SortableBranchTreeViewItemProps = SharedTreeItemProps & Pick<SortableProps, 'rearranging'>;

export const SortableTreeViewItem: FC<SortableBranchTreeViewItemProps> = ({
  node,
  level,
  rearranging,
}: SortableBranchTreeViewItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: `treeitem:${node.id}`,
    data: { dragoverlay: node, treeitem: node },
  });
  return (
    <NavTreeItem
      node={node}
      level={level}
      draggableAttributes={attributes}
      draggableListeners={listeners}
      rearranging={rearranging}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      ref={setNodeRef}
    />
  );
};

type TreeViewItemProps = SharedTreeItemProps & SortableProps;

export const NavTreeItem: ForwardRefExoticComponent<TreeViewItemProps & RefAttributes<any>> = forwardRef<
  HTMLLIElement,
  TreeViewItemProps
>(({ node, level, draggableListeners, draggableAttributes, style, rearranging }, forwardedRef) => {
  const isBranch = node.properties?.role === 'branch' || node.children.length > 0;

  const actions = sortActions(node.actions);
  const { t } = useTranslation(TREE_VIEW_PLUGIN);
  const { navigationSidebarOpen } = useSidebars();
  const { active: treeViewActive } = useTreeView();

  const suppressNextTooltip = useRef<boolean>(false);
  const [optionsTooltipOpen, setOptionsTooltipOpen] = useState(false);
  const [optionsMenuOpen, setOptionsMenuOpen] = useState(false);

  const [open, setOpen] = useState(level < 1);

  const disabled = !!node.properties?.disabled;
  const active = treeViewActive === node.id;

  useEffect(() => {
    // todo(thure): Open if child within becomes active
  }, []);

  return (
    <TreeItem.Root
      collapsible={isBranch}
      open={!disabled && open}
      onOpenChange={(nextOpen) => setOpen(disabled ? false : nextOpen)}
      classNames={['rounded block', focusRing, active && groupSurface, rearranging && 'invisible']}
      {...draggableAttributes}
      {...draggableListeners}
      style={style}
      ref={forwardedRef}
    >
      <div role='none' className={mx(levelPadding(level), 'flex items-start')}>
        {isBranch ? (
          <CollapsibleHeading open={open} node={node} level={level} />
        ) : (
          <NavigableHeading node={node} level={level} />
        )}
        {actions.length > 0 && (
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
                    classNames='shrink-0 pli-2 pointer-fine:pli-1'
                    {...(!navigationSidebarOpen && { tabIndex: -1 })}
                  >
                    <DotsThreeVertical className={getSize(4)} />
                  </Button>
                </Tooltip.Trigger>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content classNames='z-[31]'>
                  {actions.map((action) => (
                    <DropdownMenu.Item
                      key={action.id}
                      onClick={(event) => {
                        if (action.properties.disabled) {
                          return;
                        }
                        event.stopPropagation();
                        // todo(thure): Why does Dialog’s modal-ness cause issues if we don’t explicitly close the menu here?
                        suppressNextTooltip.current = true;
                        setOptionsMenuOpen(false);
                        void action.invoke();
                      }}
                      classNames='gap-2'
                      disabled={action.properties.disabled}
                    >
                      {action.icon && <action.icon className={getSize(4)} />}
                      <span>{Array.isArray(action.label) ? t(...action.label) : action.label}</span>
                    </DropdownMenu.Item>
                  ))}
                  <DropdownMenu.Arrow />
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </Tooltip.Root>
        )}
      </div>
      {isBranch && (
        <TreeItem.Body>
          <NavTree items={Object.values(node.children).flat() as Graph.Node[]} parent={node} level={level + 1} />
        </TreeItem.Body>
      )}
    </TreeItem.Root>
  );
});
