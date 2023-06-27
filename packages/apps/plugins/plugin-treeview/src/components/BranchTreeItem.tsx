//
// Copyright 2023 DXOS.org
//

import { CaretDown, CaretRight, DotsThreeVertical, Placeholder } from '@phosphor-icons/react';
import React, { useEffect, useRef, useState } from 'react';

import { GraphNode } from '@braneframe/plugin-graph';
import { Button, DropdownMenu, Tooltip, TreeItem, useSidebar, useTranslation } from '@dxos/aurora';
import { defaultDisabled, getSize } from '@dxos/aurora-theme';
import { observer } from '@dxos/observable-object/react';

import { TreeView } from './TreeView';

export const BranchTreeItem = observer(({ node }: { node: GraphNode }) => {
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

  const [open, setOpen] = useState(true /* todo(thure): Open if document within is selected */);

  useEffect(() => {
    // todo(thure): Open if child within is selected
  }, []);

  const OpenTriggerIcon = open ? CaretDown : CaretRight;

  return (
    <TreeItem.Root
      collapsible
      open={!disabled && open}
      onOpenChange={(nextOpen) => setOpen(disabled ? false : nextOpen)}
      classNames='mbe-1'
    >
      <div role='none' className='flex mis-1 items-start'>
        <TreeItem.OpenTrigger
          disabled={disabled}
          classNames={[disabled && defaultDisabled]}
          {...(disabled && { 'aria-disabled': true })}
          {...(!sidebarOpen && { tabIndex: -1 })}
        >
          <OpenTriggerIcon
            {...(hasActiveDocument && !open
              ? { weight: 'fill', className: 'text-primary-500 dark:text-primary-300' }
              : {})}
          />
        </TreeItem.OpenTrigger>
        <TreeItem.Heading
          data-testid='spacePlugin.spaceTreeItemHeading'
          classNames={[
            'grow break-words pis-1 pbs-2.5 pointer-fine:pbs-1.5 text-sm font-medium',
            error && 'text-error-700 dark:text-error-300',
            !disabled && 'cursor-pointer',
            disabled && defaultDisabled,
          ]}
          {...(disabled && { 'aria-disabled': true })}
          onClick={() => setOpen(!open)}
        >
          {Array.isArray(node.label) ? t(...node.label) : node.label}
        </TreeItem.Heading>
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
                onClick={(event) => primaryAction.invoke(t, event)}
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
