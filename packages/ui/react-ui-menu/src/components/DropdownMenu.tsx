//
// Copyright 2025 DXOS.org
//

import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, { type MouseEvent, useCallback } from 'react';

import { DropdownMenu as NaturalDropdownMenu, Icon, type DropdownMenuRootProps } from '@dxos/react-ui';

import { ActionLabel } from './ActionLabel';
import { type MenuScopedProps, useMenu, useMenuItems } from './MenuContext';
import { type MenuAction, type MenuItem, type MenuItemGroup } from '../types';

export type DropdownMenuProps = DropdownMenuRootProps & {
  group?: MenuItemGroup;
  items?: MenuItem[];
  caller?: string;
};

const DropdownMenuItem = ({
  item,
  onClick,
  __menuScope,
}: MenuScopedProps<{
  item: MenuItem;
  onClick: (action: MenuAction, event: MouseEvent) => void;
}>) => {
  // TODO(thure): handle other items.
  const action = item as MenuAction;
  const handleClick = useCallback((event: MouseEvent) => onClick(action, event), [action, onClick]);
  const { iconSize } = useMenu('DropdownMenuItem', __menuScope);
  return (
    <NaturalDropdownMenu.Item
      onClick={handleClick}
      classNames='gap-2'
      disabled={action.properties?.disabled}
      {...(action.properties?.testId && { 'data-testid': action.properties.testId })}
    >
      {action.properties?.icon && <Icon icon={action.properties!.icon} size={iconSize} />}
      <ActionLabel action={action} />
    </NaturalDropdownMenu.Item>
  );
};

const DropdownMenuRoot = ({
  items: propsItems,
  group,
  open,
  defaultOpen,
  onOpenChange,
  caller,
  children,
  __menuScope,
  ...naturalProps
}: MenuScopedProps<DropdownMenuProps>) => {
  const [optionsMenuOpen, setOptionsMenuOpen] = useControllableState({
    prop: open,
    defaultProp: defaultOpen,
    onChange: onOpenChange,
  });

  const handleActionClick = useCallback(
    (action: MenuAction, event: MouseEvent) => {
      if (action.properties?.disabled) {
        return;
      }
      event.stopPropagation();
      // TODO(thure): Why does Dialog’s modal-ness cause issues if we don’t explicitly close the menu here?
      setOptionsMenuOpen(false);
      void action.data?.({ parent: group, caller });
    },
    [group, caller],
  );

  const items = useMenuItems(group, propsItems);

  return (
    <NaturalDropdownMenu.Root open={optionsMenuOpen} onOpenChange={setOptionsMenuOpen} {...naturalProps}>
      {children}
      <NaturalDropdownMenu.Portal>
        <NaturalDropdownMenu.Content>
          <NaturalDropdownMenu.Viewport>
            {items?.map((item) => (
              <DropdownMenuItem key={item.id} item={item} onClick={handleActionClick} />
            ))}
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
