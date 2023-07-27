//
// Copyright 2023 DXOS.org
//

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Circle, DotsThreeVertical, Placeholder } from '@phosphor-icons/react';
import React, { FC, forwardRef, ForwardRefExoticComponent, RefAttributes, useRef, useState } from 'react';

import { SortableProps } from '@braneframe/plugin-dnd';
import { GraphNode, getActions, useGraph } from '@braneframe/plugin-graph';
import {
  Button,
  DropdownMenu,
  ListItem,
  Tooltip,
  TreeItem,
  useDensityContext,
  useMediaQuery,
  useSidebar,
  useTranslation,
} from '@dxos/aurora';
import { appTx, staticDisabled, focusRing, getSize, mx } from '@dxos/aurora-theme';

import { useTreeView } from '../TreeViewContext';
import { TREE_VIEW_PLUGIN } from '../types';

type SortableLeafTreeItemProps = { node: GraphNode } & Pick<SortableProps, 'rearranging'>;

export const SortableLeafTreeItem: FC<SortableLeafTreeItemProps> = ({
  node,
  rearranging,
}: SortableLeafTreeItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: `treeitem:${node.id}`,
    data: { dragoverlay: node, treeitem: node },
  });
  return (
    <LeafTreeItem
      node={node}
      draggableAttributes={attributes}
      draggableListeners={listeners}
      rearranging={rearranging}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      ref={setNodeRef}
    />
  );
};

type LeafTreeItemProps = { node: GraphNode } & SortableProps;

export const LeafTreeItem: ForwardRefExoticComponent<LeafTreeItemProps & RefAttributes<any>> = forwardRef<
  HTMLLIElement,
  LeafTreeItemProps
>(({ node, draggableListeners, draggableAttributes, style, rearranging, isOverlay }, forwardedRef) => {
  // todo(thure): Handle `sortable`

  const { invokeAction } = useGraph();
  const { sidebarOpen, closeSidebar } = useSidebar();
  const { t } = useTranslation(TREE_VIEW_PLUGIN);
  const density = useDensityContext();
  const [isLg] = useMediaQuery('lg', { ssr: false });
  const treeView = useTreeView();

  const active = node.id === treeView.active.at(-1);
  const modified = node.attributes?.modified ?? false;
  const disabled = node.attributes?.disabled ?? false;
  const error = node.attributes?.error ?? false;
  const Icon = node.icon ?? Placeholder;
  const allActions = getActions(node);
  const [primaryAction, ...actions] = allActions;
  const menuActions = disabled ? actions : allActions;

  const suppressNextTooltip = useRef<boolean>(false);
  const [optionsTooltipOpen, setOptionsTooltipOpen] = useState(false);
  const [optionsMenuOpen, setOptionsMenuOpen] = useState(false);

  return (
    <TreeItem.Root
      classNames={['pis-7 pointer-fine:pis-6 pointer-fine:pie-0 flex rounded', focusRing, rearranging && 'invisible']}
      {...draggableAttributes}
      {...draggableListeners}
      style={style}
      ref={forwardedRef}
    >
      <TreeItem.Heading
        asChild
        data-testid='spacePlugin.documentTreeItemHeading'
        classNames={appTx(
          'button.root',
          'tree-item__heading--link',
          { variant: 'ghost', density },
          'grow min-is-0 text-base p-0 font-normal flex items-start gap-1 pointer-fine:min-height-6',
          error && 'text-error-700 dark:text-error-300',
          !disabled && 'cursor-pointer',
          disabled && staticDisabled,
        )}
        {...(disabled && { 'aria-disabled': true })}
      >
        <button
          role='link'
          {...(!sidebarOpen && { tabIndex: -1 })}
          data-itemid={node.id}
          onKeyDown={(event) => {
            if (event.key === ' ' || event.key === 'Enter') {
              event.stopPropagation();
              // TODO(wittjosiah): Intent.
              treeView.active = node.parent ? [node.parent.id, node.id] : [node.id];
              !isLg && closeSidebar();
            }
          }}
          onClick={(event) => {
            // TODO(wittjosiah): Intent.
            // TODO(wittjosiah): Make recursive.
            treeView.active = node.parent ? [node.parent.id, node.id] : [node.id];
            !isLg && closeSidebar();
          }}
          className='text-start flex gap-2 justify-start'
        >
          <Icon weight='regular' className={mx(getSize(4), 'shrink-0 mbs-2')} />
          <p className={mx(modified && 'italic', 'flex-1 min-is-0 mbs-1 truncate')}>
            {Array.isArray(node.label) ? t(...node.label) : node.label}
          </p>
        </button>
      </TreeItem.Heading>
      {menuActions.length > 0 && !isOverlay && (
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
              {t('tree leaf options label')}
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
                  classNames='shrink-0 pli-2 pointer-fine:pli-1 self-start'
                  {...(!sidebarOpen && { tabIndex: -1 })}
                >
                  <DotsThreeVertical className={getSize(4)} />
                </Button>
              </Tooltip.Trigger>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content classNames='z-[31]'>
                {menuActions.map((action) => (
                  <DropdownMenu.Item
                    key={action.id}
                    onClick={(event) => {
                      suppressNextTooltip.current = true;
                      setOptionsMenuOpen(false);
                      void invokeAction(action);
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
      {disabled && primaryAction ? (
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
              onClick={() => invokeAction(primaryAction)}
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
      ) : (
        <ListItem.Endcap classNames='is-8 pointer-fine:is-6 flex items-center'>
          <Circle
            weight='fill'
            className={mx(getSize(3), 'text-primary-500 dark:text-primary-300', !active && 'invisible')}
          />
        </ListItem.Endcap>
      )}
    </TreeItem.Root>
  );
});
