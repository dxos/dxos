//
// Copyright 2023 DXOS.org
//

import React, { ComponentProps } from 'react';

import { mx } from '@dxos/aurora-theme';
import { Identity } from '@dxos/client';
import { Avatar } from '@dxos/react-appkit';

import { PanelPopover } from '../../layouts';
import { IdentityPanel } from '../../panels';

export interface IdentityPopoverProps extends Partial<ComponentProps<typeof PanelPopover>> {
  identity: Identity;
  onClickManageProfile?: () => void;
}

export const IdentityPopover = ({
  identity,
  openTrigger,
  slots,
  triggerIsInToolbar = true,
  onClickManageProfile,
  ...popoverProps
}: IdentityPopoverProps) => {
  return (
    <PanelPopover
      {...popoverProps}
      openTrigger={
        openTrigger ?? (
          <Avatar
            size={10}
            variant='circle'
            fallbackValue={identity.identityKey.toHex()}
            label={identity.profile?.displayName ?? ''}
          />
        )
      }
      slots={{
        ...slots,
        trigger: {
          ...slots?.trigger,
          className: mx(
            'flex justify-self-end pointer-events-auto bg-white dark:bg-neutral-700 p-0.5 button-elevation rounded-full',
            slots?.trigger?.className
          )
        }
      }}
      triggerIsInToolbar={triggerIsInToolbar}
    >
      <IdentityPanel {...{ identity, onClickManageProfile }} />
    </PanelPopover>
  );
};
