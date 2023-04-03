//
// Copyright 2023 DXOS.org
//
import React from 'react';

import { Identity, SpaceMember } from '@dxos/client';
import { Avatar, mx, useTranslation } from '@dxos/react-components';

import { HaloRing } from '../HaloRing';

export const IdentityListItem = ({
  identity,
  presence,
  onClick
}: {
  identity: Identity;
  presence?: SpaceMember['presence'];
  onClick?: () => void;
}) => {
  const { t } = useTranslation('os');
  return (
    <li
      className={mx('flex gap-2 items-center', onClick && 'cursor-pointer')}
      onClick={() => onClick?.()}
      data-testid='identity-list-item'
    >
      <HaloRing
        status={
          presence === SpaceMember.PresenceState.ONLINE
            ? 'active'
            : presence === SpaceMember.PresenceState.OFFLINE
            ? 'inactive'
            : undefined
        }
      >
        <Avatar
          {...{
            fallbackValue: identity.identityKey.toHex(),
            label: (
              <p className='text-sm truncate'>{identity.profile?.displayName ?? identity.identityKey.truncate()}</p>
            ),
            // ...(presence === SpaceMember.PresenceState.OFFLINE && {
            //   status: 'inactive',
            //   description: (
            //     <p className='font-system-normal text-xs text-neutral-700 dark:text-neutral-300'>
            //       {t('identity offline description')}
            //     </p>
            //   )
            // }),
            // ...(presence === SpaceMember.PresenceState.ONLINE && { status: 'active' }),
            slots: { labels: { className: 'block shrink overflow-hidden' }, root: { className: 'shrink-0' } }
          }}
        />
      </HaloRing>
      <p>{identity.profile?.displayName ?? identity.identityKey.truncate()}</p>
    </li>
  );
};
