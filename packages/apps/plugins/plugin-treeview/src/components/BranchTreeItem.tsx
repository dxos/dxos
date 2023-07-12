//
// Copyright 2023 DXOS.org
//

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CaretDown, CaretRight, DotsThreeVertical, Placeholder } from '@phosphor-icons/react';
import React, { FC, forwardRef, ForwardRefExoticComponent, RefAttributes, useEffect, useRef, useState } from 'react';

import { SortableProps } from '@braneframe/plugin-dnd';
import { GraphNode } from '@braneframe/plugin-graph';
import { Button, DropdownMenu, Tooltip, TreeItem, useSidebar, useTranslation } from '@dxos/aurora';
import { defaultDisabled, defaultFocus, getSize } from '@dxos/aurora-theme';
import { ObservableObject, subscribe } from '@dxos/observable-object';
import { useSubscription } from '@dxos/observable-object/react';

import { TreeView } from './TreeView';

type SortableBranchTreeItemProps = { node: GraphNode } & Pick<SortableProps, 'rearranging'>;

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

type BranchTreeItemProps = { node: GraphNode } & SortableProps;

export const BranchTreeItem: ForwardRefExoticComponent<BranchTreeItemProps & RefAttributes<any>> = forwardRef<
  HTMLLIElement,
  BranchTreeItemProps
>(({ node, draggableListeners, draggableAttributes, style, rearranging }, forwardedRef) => {
  // todo(thure): Handle `sortable`

  const [primaryAction, ...actions] = node.actions ?? [];
  // TODO(wittjosiah): Update namespace.
  const { t } = useTranslation('composer');
  const hasActiveDocument = false;
  const disabled = node.attributes?.disabled;
  const error = node.attributes?.error;
  const { sidebarOpen } = useSidebar();

  const suppressNextTooltip = useRef<boolean>(false);
  const [optionsTooltipOpen, setOptionsTooltipOpen] = useState(false);
  const [optionsMenuOpen, setOptionsMenuOpen] = useState(false);

  const [open, setOpen] = useState(true /* todo(thure): Open if node within is active */);

  useEffect(() => {
    // todo(thure): Open if child within becomes active
  }, []);

  // TODO(thure): This replaces `observer` since we need to `forwardRef`.
  const [_, setIter] = useState([]);
  if (subscribe in node) {
    useEffect(() => {
      return (node as ObservableObject)[subscribe](() => setIter([])) as () => void;
    }, [node]);
  } else {
    useSubscription(() => setIter([]), [node]);
  }

  const OpenTriggerIcon = open ? CaretDown : CaretRight;

  return (
    <TreeItem.Root
      collapsible
      open={!disabled && open}
      onOpenChange={(nextOpen) => setOpen(disabled ? false : nextOpen)}
      classNames={['mbe-1 rounded', defaultFocus, rearranging && 'invisible']}
      {...draggableAttributes}
      {...draggableListeners}
      style={style}
      ref={forwardedRef}
    >
      <div role='none' className='flex mis-1 items-start'>
        <TreeItem.OpenTrigger
          disabled={disabled}
          classNames={['grow flex', disabled && defaultDisabled]}
          {...(disabled && { 'aria-disabled': true })}
          {...(!sidebarOpen && { tabIndex: -1 })}
        >
          <OpenTriggerIcon
            {...(hasActiveDocument && !open
              ? { weight: 'fill', className: 'shrink-0 text-primary-500 dark:text-primary-300' }
              : {})}
          />
          <TreeItem.Heading
            data-testid='spacePlugin.spaceTreeItemHeading'
            classNames={[
              'grow text-start break-words pis-1 pbs-2.5 pointer-fine:pbs-1.5 text-sm font-medium',
              error && 'text-error-700 dark:text-error-300',
              !disabled && 'cursor-pointer',
              disabled && defaultDisabled,
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
                    <DropdownMenu.Item
                      key={action.id}
                      onClick={(event) => {
                        event.stopPropagation();
                        // todo(thure): Why does Dialog’s modal-ness cause issues if we don’t explicitly close the menu here?
                        suppressNextTooltip.current = true;
                        setOptionsMenuOpen(false);
                        void action.invoke(t, event);
                      }}
                      classNames='gap-2'
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
        {primaryAction && (
          <Tooltip.Root>
            <Tooltip.Portal>
              <Tooltip.Content side='bottom' classNames='z-[31]'>
                {Array.isArray(primaryAction.label) ? t(...primaryAction.label) : primaryAction.label}
                <Tooltip.Arrow />
              </Tooltip.Content>
            </Tooltip.Portal>
            <Tooltip.Trigger asChild>
              <Button
                variant='ghost'
                classNames='shrink-0 pli-2 pointer-fine:pli-1'
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.stopPropagation();
                    void primaryAction.invoke(t, event);
                  }
                }}
                onClick={(event) => {
                  void primaryAction.invoke(t, event);
                }}
                {...(primaryAction.testId && { 'data-testid': primaryAction.testId })}
                {...(!sidebarOpen && { tabIndex: -1 })}
              >
                <span className='sr-only'>
                  {Array.isArray(primaryAction.label) ? t(...primaryAction.label) : primaryAction.label}
                </span>
                {primaryAction.icon ? (
                  <primaryAction.icon className={getSize(4)} />
                ) : (
                  <Placeholder className={getSize(4)} />
                )}
              </Button>
            </Tooltip.Trigger>
          </Tooltip.Root>
        )}
      </div>
      <TreeItem.Body>
        <TreeView items={node.children} parent={node} />
      </TreeItem.Body>
    </TreeItem.Root>
  );
});
