//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Popover, Avatar, useJdenticonHref } from '@dxos/aurora';
import { openOutline, focusRing, hoverColors } from '@dxos/aurora-theme';
import { Identity } from '@dxos/react-client/halo';

import { IdentityPanel } from '../../panels';

export type IdentityPopoverProps = {
  identity: Identity;
  onClickManageProfile?: () => void;
};

export const IdentityPopover = ({ identity, onClickManageProfile }: IdentityPopoverProps) => {
  const fallbackHref = useJdenticonHref(identity.identityKey.toHex(), 10);
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Avatar.Root size={10} variant='circle'>
          <Avatar.Frame classNames={['shadow-md cursor-pointer rounded-md', hoverColors, focusRing, openOutline]}>
            <Avatar.Fallback href={fallbackHref} />
          </Avatar.Frame>
          <Avatar.Label>{identity.profile?.displayName ?? ''}</Avatar.Label>
        </Avatar.Root>
      </Popover.Trigger>
      <Popover.Content>
        <IdentityPanel {...{ identity, onClickManageProfile }} />
      </Popover.Content>
    </Popover.Root>
  );
};
