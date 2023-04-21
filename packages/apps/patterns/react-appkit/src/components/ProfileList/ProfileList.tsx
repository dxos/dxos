//
// Copyright 2022 DXOS.org
//
import React from 'react';

import { useTranslation, defaultDisabled, defaultGroup, mx } from '@dxos/aurora';
import type { Identity } from '@dxos/client';
import { useIdentity } from '@dxos/react-client';
import { humanize } from '@dxos/util';

import { Avatar } from '../Avatar';
import { Group } from '../Group';
import { Tag } from '../Tag';

export interface ProfileListProps {
  identities: Identity[];
}

export const ProfileList = ({ identities }: ProfileListProps) => {
  const { t } = useTranslation('appkit');
  const myIdentity = useIdentity();
  const myIdentityHex = myIdentity?.identityKey.toHex();
  return identities.length > 0 ? (
    <ul className='flex flex-col gap-2 mlb-4'>
      {identities.map((identity) => {
        const identityHex = identity.identityKey.toHex();
        return (
          <li
            key={identityHex}
            className={mx(
              defaultGroup({ elevation: 'group', spacing: 'p-1', rounding: 'rounded' }),
              'flex gap-2 items-center'
            )}
          >
            <Avatar
              variant='circle'
              fallbackValue={identityHex}
              label={
                <p>
                  {identity.profile?.displayName ?? humanize(identityHex)}
                  {identityHex === myIdentityHex && (
                    <Tag valence='info' className='mli-2 align-middle'>
                      {t('current identity label')}
                    </Tag>
                  )}
                </p>
              }
            />
          </li>
        );
      })}
    </ul>
  ) : (
    <Group
      className='mlb-4'
      label={{
        level: 2,
        children: t('empty members message'),
        className: mx('text-xl', defaultDisabled)
      }}
      elevation='base'
    />
  );
};
