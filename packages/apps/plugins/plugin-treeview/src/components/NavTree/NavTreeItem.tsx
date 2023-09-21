//
// Copyright 2023 DXOS.org
//

import { DotsThreeVertical } from '@phosphor-icons/react';
import React, {
  forwardRef,
  ForwardRefExoticComponent,
  Fragment,
  PropsWithChildren,
  Ref,
  RefAttributes,
  useEffect,
  useRef,
  useState,
} from 'react';

import { SortableProps } from '@braneframe/plugin-dnd';
import { Graph, useGraph } from '@braneframe/plugin-graph';
import { useSplitView } from '@braneframe/plugin-splitview';
import {
  Button,
  DensityProvider,
  DropdownMenu,
  Popover,
  Tooltip,
  Tree,
  TreeItem,
  useSidebars,
  useTranslation,
} from '@dxos/aurora';
import { DelegatorProps } from '@dxos/aurora-grid';
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
import { SharedTreeItemProps } from './props';
import { useTreeView } from '../../TreeViewContext';
import { TREE_VIEW_PLUGIN } from '../../types';
import { sortActions } from '../../util';

type TreeViewItemProps = PropsWithChildren<SharedTreeItemProps & SortableProps>;

export const NavTreeItemDelegator = forwardRef<HTMLElement, { data: DelegatorProps<Graph.Node> }>(
  (
    {
      data: {
        tile,
        data,
        dragHandleListeners,
        dragHandleAttributes,
        style,
        children,
        isActive,
        isOverlay,
        isMigrationDestination,
      },
    },
    forwardedRef,
  ) => {
    switch (tile.variant) {
      case 'stack':
        return (
          <Tree.Root role='tree' classNames='pbs-1 pbe-4 pli-1' ref={forwardedRef as Ref<HTMLOListElement>}>
            {children}
          </Tree.Root>
        );
      case 'treeitem':
        return (
          <NavTreeItem
            node={data}
            level={tile.level}
            draggableAttributes={dragHandleAttributes}
            draggableListeners={dragHandleListeners}
            style={style}
            rearranging={isActive}
            isOverlay={isOverlay}
            {...(isMigrationDestination && { migrating: 'into' })}
            ref={forwardedRef}
          >
            {children}
          </NavTreeItem>
        );
      default:
        return null;
    }
  },
);

const hoverableDescriptionIcons =
  '[--icons-color:inherit] hover-hover:[--icons-color:var(--description-text)] hover-hover:hover:[--icons-color:inherit] focus-within:[--icons-color:inherit]';

export const NavTreeItem: ForwardRefExoticComponent<TreeViewItemProps & RefAttributes<any>> = forwardRef<
  HTMLLIElement,
  TreeViewItemProps
>(
  (
    {
      node,
      level,
      children,
      draggableListeners,
      draggableAttributes,
      style,
      rearranging,
      migrating,
      isPreview,
      isOverlay,
    },
    forwardedRef,
  ) => {
    const isBranch = node.properties?.role === 'branch' || node.children.length > 0;

    const actions = sortActions(node.actions);
    const { t } = useTranslation(TREE_VIEW_PLUGIN);
    const { navigationSidebarOpen } = useSidebars();
    // TODO(wittjosiah): Pass in as prop.
    const { active: treeViewActive } = useTreeView();
    // TODO(wittjosiah): Pass in as prop.
    const { popoverAnchorId } = useSplitView();
    const { graph } = useGraph();

    const suppressNextTooltip = useRef<boolean>(false);
    const [optionsTooltipOpen, setOptionsTooltipOpen] = useState(false);
    const [optionsMenuOpen, setOptionsMenuOpen] = useState(false);

    const [open, setOpen] = useState(level < 1);

    const disabled = !!(node.properties?.disabled ?? node.properties?.isPreview);
    const forceCollapse = isOverlay || isPreview || rearranging || disabled;
    const active = treeViewActive === node.id;
    const testId = node.properties?.['data-testid'];

    useEffect(() => {
      // TODO(wittjosiah): Factor out as callback so that this doesn't depend on graph context.
      // Excludes selected node from being opened by selection.
      if (treeViewActive && graph.getPath(treeViewActive)?.slice(0, -2).includes(node.id)) {
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
      <DensityProvider density='fine'>
        <TreeItem.Root
          collapsible={isBranch}
          open={!forceCollapse && open}
          onOpenChange={(nextOpen) => setOpen(forceCollapse ? false : nextOpen)}
          classNames={[
            'rounded block',
            hoverableFocusedKeyboardControls,
            'transition-opacity',
            (rearranging || isPreview) && 'opacity-0',
            focusRing,
            migrating === 'into' && dropRing,
            level === 0 ? 'mbs-4 first:mbs-0' : '',
          ]}
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
              hoverableDescriptionIcons,
              level < 1 && topLevelCollapsibleSpacing,
              !isOverlay && (active || isPopoverAnchor) && 'bg-neutral-75 dark:bg-neutral-850',
              'flex items-start rounded',
            )}
            data-testid={testId}
          >
            <NavTreeItemHeading {...{ open, node, level, active }} />
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
                          isOverlay && 'invisible',
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
                                {action.icon && <action.icon className={getSize(4)} />}
                                <span>{Array.isArray(action.label) ? t(...action.label) : action.label}</span>
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
          </HeadingWithActionsRoot>
          {children}
        </TreeItem.Root>
      </DensityProvider>
    );
  },
);
