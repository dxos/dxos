//
// Copyright 2026 DXOS.org
//

import React, { type ReactNode } from 'react';

import * as Button from '@dxos/react-ui/Button';
import * as Menu from '@dxos/react-ui/Menu';

export type InspectorMenuProps = {
  /** The inspector's less frequent actions. */
  'children'?: ReactNode;
  'data-testid'?: string;
};

/** An inspector's overflow menu, at the end of its actions; docking is the inspector panel's, not the inspector's. */
export const InspectorMenu = ({ children, 'data-testid': testId = 'inspector-menu' }: InspectorMenuProps) => {
  if (!children) {
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
      <Menu.Content>{children}</Menu.Content>
    </Menu.Root>
  );
};
