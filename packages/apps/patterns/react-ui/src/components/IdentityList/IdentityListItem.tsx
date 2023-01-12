//
// Copyright 2023 DXOS.org
//
import React from 'react';

import { Profile, SpaceMember } from '@dxos/client';
import { Avatar, useTranslation } from '@dxos/react-components';

export const IdentityListItem = ({ identity, presence }: { identity: Profile; presence?: SpaceMember['presence'] }) => {
  const { t } = useTranslation('os');
  return (
    <li className='flex gap-2 items-center'>
      <Avatar
        {...{
          variant: 'circle',
          size: 9,
          fallbackValue: identity.identityKey.toHex(),
          label: <p className='text-sm truncate'>{identity.displayName ?? identity.identityKey.truncate()}</p>,
          ...(presence === SpaceMember.PresenceState.OFFLINE && {
            status: 'inactive',
            description: (
              <p className='font-system-normal text-xs text-neutral-700 dark:text-neutral-300'>
                {t('identity offline description')}
              </p>
            )
          }),
          ...(presence === SpaceMember.PresenceState.ONLINE && { status: 'active' }),
          slots: { labels: { className: 'block' } }
        }}
      />
    </li>
  );
};
