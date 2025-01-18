//
// Copyright 2025 DXOS.org
//

import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, { type MouseEvent, type MutableRefObject, useCallback, useMemo } from 'react';

import { DropdownMenu as NaturalDropdownMenu, Icon, type DropdownMenuRootProps } from '@dxos/react-ui';

import { ActionLabel } from './ActionLabel';
import { useMenu } from './MenuContext';
import { type MenuAction, type MenuItem, type MenuItemGroup } from '../defs';

export type DropdownMenuProps = DropdownMenuRootProps & {
  group?: MenuItemGroup;
  suppressNextTooltip?: MutableRefObject<boolean>;
};

const DropdownMenuItem = ({
  item,
  onClick,
}: {
  item: MenuItem;
  onClick: (action: MenuAction, event: MouseEvent) => void;
}) => {
  // TODO(thure): handle other items.
  const action = item as MenuAction;
  const handleClick = useCallback((event: MouseEvent) => onClick(action, event), [action, onClick]);
  return (
    <NaturalDropdownMenu.Item
      onClick={handleClick}
      classNames='gap-2'
      disabled={action.properties?.disabled}
      {...(action.properties?.testId && { 'data-testid': action.properties.testId })}
    >
      {action.properties?.icon && <Icon icon={action.properties!.icon} size={4} />}
      <ActionLabel action={action} />
    </NaturalDropdownMenu.Item>
  );
};

const DropdownMenuRoot = ({
  group,
  open,
  defaultOpen,
  onOpenChange,
  suppressNextTooltip,
  children,
  ...naturalProps
}: DropdownMenuProps) => {
  const [optionsMenuOpen, setOptionsMenuOpen] = useControllableState({
    prop: open,
    defaultProp: defaultOpen,
    onChange: onOpenChange,
  });

  const { onAction, resolveGroupItems } = useMenu();

  const handleActionClick = useCallback(
    (action: MenuAction, event: MouseEvent) => {
      if (action.properties?.disabled) {
        return;
      }
      event.stopPropagation();
      // TODO(thure): Why does Dialog’s modal-ness cause issues if we don’t explicitly close the menu here?
      if (suppressNextTooltip) {
        suppressNextTooltip.current = true;
      }
      setOptionsMenuOpen(false);
      onAction?.(action);
    },
    [onAction],
  );

  const items = useMemo(() => resolveGroupItems?.(group), [group, resolveGroupItems]);

  return (
    <NaturalDropdownMenu.Root
      {...{
        open: optionsMenuOpen,
        onOpenChange: (nextOpen: boolean) => {
          if (!nextOpen && suppressNextTooltip) {
            suppressNextTooltip.current = true;
          }
          return setOptionsMenuOpen(nextOpen);
        },
      }}
      {...naturalProps}
    >
      {children}
      <NaturalDropdownMenu.Portal>
        <NaturalDropdownMenu.Content>
          <NaturalDropdownMenu.Viewport>
            {items?.map((item) => <DropdownMenuItem key={item.id} item={item} onClick={handleActionClick} />)}
          </NaturalDropdownMenu.Viewport>
          <NaturalDropdownMenu.Arrow />
        </NaturalDropdownMenu.Content>
      </NaturalDropdownMenu.Portal>
    </NaturalDropdownMenu.Root>
  );
};

export const DropdownMenu = {
  Root: DropdownMenuRoot,
  Trigger: NaturalDropdownMenu.Trigger,
  VirtualTrigger: NaturalDropdownMenu.VirtualTrigger,
};
