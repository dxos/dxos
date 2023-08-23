//
// Copyright 2023 DXOS.org
//
import React from 'react';

import { ListItem, Avatar, useJdenticonHref } from '@dxos/aurora';
import { chromeSurface, mx } from '@dxos/aurora-theme';
import { SpaceMember } from '@dxos/react-client/echo';
import { Identity } from '@dxos/react-client/halo';
import { humanize } from '@dxos/util';

export const IdentityListItem = ({
  identity,
  presence,
  onClick,
}: {
  identity: Identity;
  presence?: SpaceMember['presence'];
  onClick?: () => void;
}) => {
  // const { t } = useTranslation('os');
  const fallbackValue = identity.identityKey.toHex();
  const jdenticon = useJdenticonHref(fallbackValue ?? '', 12);
  const displayName = identity.profile?.displayName ?? humanize(identity.identityKey);
  return (
    <ListItem.Root
      classNames={mx('rounded p-2 flex gap-2 items-center', chromeSurface, onClick && 'cursor-pointer')}
      onClick={() => onClick?.()}
      data-testid='identity-list-item'
    >
      <ListItem.Heading classNames='sr-only'></ListItem.Heading>
      <Avatar.Root status={presence === SpaceMember.PresenceState.ONLINE ? 'active' : 'inactive'}>
        <Avatar.Frame>
          <Avatar.Fallback href={jdenticon} />
        </Avatar.Frame>
      </Avatar.Root>
      <span className='text-sm truncate pli-2'>{displayName}</span>
      {/* <Avatar
        {...{
          variant: 'circle',
          size: 9,
          fallbackValue: identity.identityKey.toHex(),
          label: <p className='text-sm truncate'>{displayName}</p>,
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
      /> */}
    </ListItem.Root>
  );
};
