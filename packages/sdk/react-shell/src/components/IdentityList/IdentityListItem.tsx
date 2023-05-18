//
// Copyright 2023 DXOS.org
//
import React from 'react';

import { useTranslation } from '@dxos/aurora';
import { mx } from '@dxos/aurora-theme';
import { Identity, SpaceMember } from '@dxos/client';
import { Avatar } from '@dxos/react-appkit';

export const IdentityListItem = ({
  identity,
  presence,
  onClick,
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
      <Avatar
        {...{
          variant: 'circle',
          size: 9,
          fallbackValue: identity.identityKey.toHex(),
          label: <p className='text-sm truncate'>{identity.profile?.displayName ?? identity.identityKey.truncate()}</p>,
          ...(presence === SpaceMember.PresenceState.OFFLINE && {
            status: 'inactive',
            description: (
              <p
                className='font-system-normal text-xs text-neutral-700 dark:text-neutral-300'
                data-testid='identity-list-item.description'
              >
                {t('identity offline description')}
              </p>
            ),
          }),
          ...(presence === SpaceMember.PresenceState.ONLINE && { status: 'active' }),
          slots: { labels: { className: 'block shrink overflow-hidden' }, root: { className: 'shrink-0' } },
        }}
      />
    </li>
  );
};
