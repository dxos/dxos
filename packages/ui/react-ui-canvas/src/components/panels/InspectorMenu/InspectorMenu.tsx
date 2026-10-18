//
// Copyright 2026 DXOS.org
//

import React, { type ReactNode } from 'react';

import * as Button from '@dxos/react-ui/Button';
import * as Menu from '@dxos/react-ui/Menu';

export type InspectorMenuProps = {
  /** Whether the inspector is docked; names the item that moves it. */
  'docked'?: boolean;
  /** Offered, the menu ends with an item that docks or floats the inspectors. */
  'onDockedChange'?: (docked: boolean) => void;
  /** The inspector's own items, above the dock item. */
  'children'?: ReactNode;
  'data-testid'?: string;
};

/** An inspector's menu, at its toolbar's end: its own items, then docking or floating the inspectors. */
export const InspectorMenu = ({
  docked = false,
  onDockedChange,
  children,
  'data-testid': testId = 'inspector-menu',
}: InspectorMenuProps) => {
  if (!children && !onDockedChange) {
    return null;
  }
  return (
    <Menu.Root positioning={{ placement: 'bottom-end', gutter: 4 }}>
      <Menu.Trigger asChild>
        <Button.Root
          variant='ghost'
          iconOnly
          icon='ph--dots-three-vertical--regular'
          label='Inspector actions'
          data-testid={testId}
        />
      </Menu.Trigger>
      <Menu.Content>
        {children}
        {children && onDockedChange && <Menu.Separator />}
        {onDockedChange && (
          <Menu.Item
            item={
              docked
                ? { value: 'float', label: 'Float inspectors', icon: 'ph--arrow-square-out--regular' }
                : { value: 'dock', label: 'Dock inspectors', icon: 'ph--sidebar-simple--regular' }
            }
            data-testid='inspector-dock-toggle'
            onSelect={() => onDockedChange(!docked)}
          />
        )}
      </Menu.Content>
    </Menu.Root>
  );
};
