//
// Copyright 2023 DXOS.org
//

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DotsThreeVertical } from '@phosphor-icons/react';
import React, {
  FC,
  forwardRef,
  ForwardRefExoticComponent,
  Fragment,
  RefAttributes,
  useEffect,
  useRef,
  useState,
} from 'react';

import { SortableProps } from '@braneframe/plugin-dnd';
import { Graph, useGraph } from '@braneframe/plugin-graph';
import { useSplitView } from '@braneframe/plugin-splitview';
import { Button, DropdownMenu, Popover, Tooltip, TreeItem, useSidebars, useTranslation } from '@dxos/aurora';
import {
  focusRing,
  getSize,
  hoverableControlItem,
  hoverableControls,
  hoverableFocusedKeyboardControls,
  hoverableFocusedWithinControls,
  hoverableOpenControlItem,
  mx,
} from '@dxos/aurora-theme';

import { useTreeView } from '../../TreeViewContext';
import { TREE_VIEW_PLUGIN } from '../../types';
import { sortActions } from '../../util';
import { CollapsibleHeading } from './CollapsibleHeading';
import { NavTree } from './NavTree';
import { NavigableHeading } from './NavigableHeading';
import { levelPadding } from './navtree-fragments';
import { SharedTreeItemProps } from './props';

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
  const { popoverAnchorId } = useSplitView();
  const { graph } = useGraph();

  const suppressNextTooltip = useRef<boolean>(false);
  const [optionsTooltipOpen, setOptionsTooltipOpen] = useState(false);
  const [optionsMenuOpen, setOptionsMenuOpen] = useState(false);

  const [open, setOpen] = useState(level < 1);

  const disabled = !!node.properties?.disabled;
  const active = treeViewActive === node.id;

  useEffect(() => {
    if (treeViewActive && graph.getPath(treeViewActive)?.includes(node.id)) {
      setOpen(true);
    }
  }, [graph, treeViewActive]);

  const headingAnchorId = `dxos.org/plugin/treeview/NavTreeItem/${node.id}`;
  const isPopoverAnchor = popoverAnchorId === headingAnchorId;

  const HeadingWithActionsRoot = isPopoverAnchor ? Popover.Anchor : 'div';

  // TODO(burdon): Factor out heuristic to group actions.
  const actionGroups =
    level === 1
      ? actions.reduce<{ id: string; actions: Graph.Action[] }[]>((groups, action) => {
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
    <TreeItem.Root
      collapsible={isBranch}
      open={!disabled && open}
      onOpenChange={(nextOpen) => setOpen(disabled ? false : nextOpen)}
      classNames={['rounded block', hoverableFocusedKeyboardControls, focusRing, rearranging && 'invisible']}
      {...draggableAttributes}
      {...draggableListeners}
      style={style}
      ref={forwardedRef}
    >
      <HeadingWithActionsRoot
        role='none'
        className={mx(
          levelPadding(level),
          hoverableControls,
          hoverableFocusedWithinControls,
          (active || isPopoverAnchor) && 'bg-neutral-75 dark:bg-neutral-850',
          'flex items-start rounded',
        )}
      >
        {isBranch ? (
          <CollapsibleHeading {...{ open, node, level, active }} />
        ) : (
          <NavigableHeading {...{ node, level, active }} />
        )}
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
                    classNames={['shrink-0 pli-2 pointer-fine:pli-1', hoverableControlItem, hoverableOpenControlItem]}
                    data-testid={`spacePlugin.spaceTreeItemActionsLevel${level}`}
                    {...(!navigationSidebarOpen && { tabIndex: -1 })}
                  >
                    <DotsThreeVertical className={getSize(4)} />
                  </Button>
                </Tooltip.Trigger>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content classNames='z-[31]'>
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
                          {action.icon && <action.icon className={getSize(4)} />}
                          <span>{Array.isArray(action.label) ? t(...action.label) : action.label}</span>
                        </DropdownMenu.Item>
                      ))}
                      {i < actionGroups.length - 1 && <DropdownMenu.Separator />}
                    </Fragment>
                  ))}
                  <DropdownMenu.Arrow />
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </Tooltip.Root>
        )}
      </HeadingWithActionsRoot>
      {isBranch && (
        <TreeItem.Body>
          <NavTree items={Object.values(node.children).flat() as Graph.Node[]} parent={node} level={level + 1} />
        </TreeItem.Body>
      )}
    </TreeItem.Root>
  );
});
