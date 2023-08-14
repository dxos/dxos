//
// Copyright 2023 DXOS.org
//

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CaretDown, CaretRight, DotsThreeVertical } from '@phosphor-icons/react';
import React, { FC, forwardRef, ForwardRefExoticComponent, RefAttributes, useEffect, useRef, useState } from 'react';

import { SortableProps } from '@braneframe/plugin-dnd';
import { SessionNode, useActions, useNavChildren } from '@braneframe/plugin-session';
import { Button, DropdownMenu, Tooltip, TreeItem, useSidebar, useTranslation } from '@dxos/aurora';
import { staticDisabled, focusRing, getSize, mx } from '@dxos/aurora-theme';

import { TREE_VIEW_PLUGIN } from '../types';
import { ActionItem, PrimaryAction } from './Actions';
import { TreeView } from './TreeView';

type SortableBranchTreeItemProps = { node: SessionNode } & Pick<SortableProps, 'rearranging'>;

export const SortableBranchTreeItem: FC<SortableBranchTreeItemProps> = ({
  node,
  rearranging,
}: SortableBranchTreeItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: `treeitem:${node.id}`,
    data: { dragoverlay: node, treeitem: node },
  });
  return (
    <BranchTreeItem
      node={node}
      draggableAttributes={attributes}
      draggableListeners={listeners}
      rearranging={rearranging}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      ref={setNodeRef}
    />
  );
};

type BranchTreeItemProps = { node: SessionNode } & SortableProps;

export const BranchTreeItem: ForwardRefExoticComponent<BranchTreeItemProps & RefAttributes<any>> = forwardRef<
  HTMLLIElement,
  BranchTreeItemProps
>(({ node, draggableListeners, draggableAttributes, style, rearranging }, forwardedRef) => {
  // todo(thure): Handle `sortable`

  const actionMap = useActions(node.id);
  const childItems = useNavChildren(node.id);
  const [primaryAction, ...actions] = Object.values(actionMap);
  const { t } = useTranslation(TREE_VIEW_PLUGIN);
  const hasActiveDocument = false;
  const disabled = !!node.params?.disabled;
  const error = !!node.params?.error;
  const { sidebarOpen } = useSidebar();

  const suppressNextTooltip = useRef<boolean>(false);
  const [optionsTooltipOpen, setOptionsTooltipOpen] = useState(false);
  const [optionsMenuOpen, setOptionsMenuOpen] = useState(false);

  const [open, setOpen] = useState(true /* todo(thure): Open if node within is active */);

  useEffect(() => {
    // todo(thure): Open if child within becomes active
  }, []);

  const OpenTriggerIcon = open ? CaretDown : CaretRight;

  return (
    <TreeItem.Root
      collapsible
      open={!disabled && open}
      onOpenChange={(nextOpen) => setOpen(disabled ? false : nextOpen)}
      classNames={['mbe-1 rounded', focusRing, rearranging && 'invisible']}
      {...draggableAttributes}
      {...draggableListeners}
      style={style}
      ref={forwardedRef}
    >
      <div role='none' className='flex mis-1 items-start'>
        <TreeItem.OpenTrigger
          disabled={disabled}
          classNames={['grow flex', disabled && staticDisabled]}
          {...(disabled && { 'aria-disabled': true })}
          {...(!sidebarOpen && { tabIndex: -1 })}
        >
          <OpenTriggerIcon
            weight='fill'
            className={mx(
              'shrink-0',
              getSize(2),
              hasActiveDocument && !open && 'text-primary-500 dark:text-primary-300',
            )}
          />
          <TreeItem.Heading
            data-testid='spacePlugin.spaceTreeItemHeading'
            classNames={[
              'grow min-is-0 truncate text-start pis-1 pbs-2.5 pointer-fine:pbs-1.5 text-sm font-medium',
              error && 'text-error-700 dark:text-error-300',
              !disabled && 'cursor-pointer',
              disabled && staticDisabled,
            ]}
            {...(disabled && { 'aria-disabled': true })}
          >
            {Array.isArray(node.label) ? t(...node.label) : node.label}
          </TreeItem.Heading>
        </TreeItem.OpenTrigger>
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
                    {...(!sidebarOpen && { tabIndex: -1 })}
                  >
                    <DotsThreeVertical className={getSize(4)} />
                  </Button>
                </Tooltip.Trigger>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content classNames='z-[31]'>
                  {actions.map((action) => (
                    <ActionItem
                      key={action.id}
                      action={action}
                      suppressNextTooltip={suppressNextTooltip}
                      setOptionsMenuOpen={setOptionsMenuOpen}
                    />
                  ))}
                  <DropdownMenu.Arrow />
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </Tooltip.Root>
        )}
        {primaryAction && <PrimaryAction action={primaryAction} />}
      </div>
      <TreeItem.Body>
        <TreeView node={node} />
      </TreeItem.Body>
    </TreeItem.Root>
  );
});
