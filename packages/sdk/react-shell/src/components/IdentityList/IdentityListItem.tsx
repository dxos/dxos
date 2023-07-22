//
// Copyright 2023 DXOS.org
//
import React from 'react';

import { useTranslation } from '@dxos/aurora';
import { mx } from '@dxos/aurora-theme';
import { Avatar } from '@dxos/react-appkit';
import { SpaceMember } from '@dxos/react-client/echo';
import { Identity } from '@dxos/react-client/halo';

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
          slots: { labels: { className: 'block shrink overflow-hidden' }, root: { classNames: 'shrink-0' } },
        }}
      />
    </li>
  );
};
