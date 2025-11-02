//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { Icon, Popover } from '@dxos/react-ui';

export const PopoverCardContainer = ({
  children,
  icon = 'ph--placeholder--regular',
}: PropsWithChildren<{ icon: string }>) => {
  return (
    <Popover.Root open>
      <Popover.Content onOpenAutoFocus={(event) => event.preventDefault()}>
        <Popover.Viewport>{children}</Popover.Viewport>
        <Popover.Arrow />
      </Popover.Content>
      <Popover.Trigger>
        <Icon icon={icon} />
      </Popover.Trigger>
    </Popover.Root>
  );
};
