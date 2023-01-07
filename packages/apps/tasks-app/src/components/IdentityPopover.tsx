//
// Copyright 2023 DXOS.org
//

import React from 'react';

import type { Profile } from '@dxos/client';
import { Avatar } from '@dxos/react-components';
import { IdentityPanel, PanelPopover } from '@dxos/react-ui';

export const IdentityPopover = ({ identity }: { identity: Profile }) => {
  return (
    <PanelPopover
      openTrigger={
        <Avatar
          size={10}
          variant='circle'
          fallbackValue={identity.identityKey.toHex()}
          label={identity.displayName ?? ''}
        />
      }
      slots={{
        trigger: {
          className:
            'flex justify-self-end pointer-events-auto bg-white dark:bg-neutral-700 p-0.5 button-elevation rounded-full'
        }
      }}
      triggerIsInToolbar
    >
      <IdentityPanel />
    </PanelPopover>
  );
};
