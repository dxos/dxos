//
// Copyright 2023 DXOS.org
//

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CaretDown, CaretRight, DotsThreeVertical } from '@phosphor-icons/react';
import React, { FC, forwardRef, ForwardRefExoticComponent, RefAttributes, useEffect, useRef, useState } from 'react';

import { SortableProps } from '@braneframe/plugin-dnd';
import { Graph } from '@braneframe/plugin-graph';
import { Button, DropdownMenu, Tooltip, TreeItem, useMediaQuery, useSidebars, useTranslation } from '@dxos/aurora';
import { staticDisabled, focusRing, getSize, mx, auroraTx, valenceColorText } from '@dxos/aurora-theme';

import { useTreeView } from '../../TreeViewContext';
import { SharedTreeItemProps, TREE_VIEW_PLUGIN } from '../../types';
import { sortActions } from '../../util';
import { NavTree } from './NavTree';

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

const CollapsibleHeadingRoot = ({ open, node }: { open: boolean; node: Graph.Node }) => {
  const { navigationSidebarOpen } = useSidebars();
  const { t } = useTranslation(TREE_VIEW_PLUGIN);

  const disabled = !!node.properties?.disabled;
  const error = !!node.properties?.error;
  const OpenTriggerIcon = open ? CaretDown : CaretRight;

  return (
    <TreeItem.OpenTrigger
      disabled={disabled}
      classNames={['grow flex-1', disabled && staticDisabled]}
      {...(disabled && { 'aria-disabled': true })}
      {...(!navigationSidebarOpen && { tabIndex: -1 })}
    >
      <OpenTriggerIcon weight='fill' className={mx('shrink-0', getSize(2))} />
      <TreeItem.Heading
        data-testid='spacePlugin.spaceTreeItemHeading'
        classNames={[
          'grow min-is-0 truncate text-start pis-1 pbs-2.5 pointer-fine:pbs-1.5 text-sm font-medium',
          error && valenceColorText('error'),
          disabled && staticDisabled,
        ]}
      >
        {Array.isArray(node.label) ? t(...node.label) : node.label}
      </TreeItem.Heading>
    </TreeItem.OpenTrigger>
  );
};

const NavigableHeadingRoot = ({ node }: { node: Graph.Node }) => {
  const [isLg] = useMediaQuery('lg', { ssr: false });
  const { navigationSidebarOpen, closeNavigationSidebar } = useSidebars();
  const { t } = useTranslation(TREE_VIEW_PLUGIN);
  const treeView = useTreeView();

  const disabled = !!node.properties?.disabled;
  const error = !!node.properties?.error;
  const modified = node.properties?.modified ?? false;

  return (
    <TreeItem.Heading
      asChild
      data-testid='spacePlugin.documentTreeItemHeading'
      classNames={auroraTx(
        'button.root',
        'tree-item__heading--link',
        { variant: 'ghost', density: 'fine' },
        'grow min-is-0 text-base p-0 font-normal flex items-start gap-1 pointer-fine:min-height-6',
        disabled && staticDisabled,
        error && valenceColorText('error'),
      )}
      {...(disabled && { 'aria-disabled': true })}
    >
      <button
        role='link'
        {...(!navigationSidebarOpen && { tabIndex: -1 })}
        data-itemid={node.id}
        onKeyDown={(event) => {
          if (event.key === ' ' || event.key === 'Enter') {
            event.stopPropagation();
            // TODO(wittjosiah): Intent.
            treeView.active = node.id;
            !isLg && closeNavigationSidebar();
          }
        }}
        onClick={(event) => {
          // TODO(wittjosiah): Intent.
          treeView.active = node.id;
          !isLg && closeNavigationSidebar();
        }}
        className='text-start flex gap-2 justify-start'
      >
        {node.icon && <node.icon className={mx(getSize(4), 'shrink-0 mbs-2')} />}
        <p className={mx(modified && 'italic', 'flex-1 min-is-0 mbs-1 truncate')}>
          {Array.isArray(node.label) ? t(...node.label) : node.label}
        </p>
      </button>
    </TreeItem.Heading>
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

  const suppressNextTooltip = useRef<boolean>(false);
  const [optionsTooltipOpen, setOptionsTooltipOpen] = useState(false);
  const [optionsMenuOpen, setOptionsMenuOpen] = useState(false);

  const [open, setOpen] = useState(true /* todo(thure): Open if node within is active */);

  const disabled = !!node.properties?.disabled;

  useEffect(() => {
    // todo(thure): Open if child within becomes active
  }, []);

  return (
    <TreeItem.Root
      collapsible={isBranch}
      open={!disabled && open}
      onOpenChange={(nextOpen) => setOpen(disabled ? false : nextOpen)}
      classNames={['mbe-1 rounded', focusRing, rearranging && 'invisible']}
      {...draggableAttributes}
      {...draggableListeners}
      style={style}
      ref={forwardedRef}
    >
      <div role='none' className='flex mis-1 items-start'>
        {isBranch ? <CollapsibleHeadingRoot open={open} node={node} /> : <NavigableHeadingRoot node={node} />}
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
