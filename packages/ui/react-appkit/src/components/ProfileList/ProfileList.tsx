//
// Copyright 2022 DXOS.org
//
import React from 'react';

import { Tag, useTranslation } from '@dxos/react-ui';
import { staticDisabled, group, mx } from '@dxos/react-ui-theme';
import { type Identity, useIdentity } from '@dxos/react-client/halo';
import { humanize } from '@dxos/util';

import { Avatar } from '../Avatar';
import { Group } from '../Group';

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
          <li key={identityHex} className={mx(group({ elevation: 'group' }), 'p-1 rounded flex gap-2 items-center')}>
            <Avatar
              variant='circle'
              fallbackValue={identityHex}
              label={
                <p>
                  {identity.profile?.displayName ?? humanize(identityHex)}
                  {identityHex === myIdentityHex && (
                    <Tag palette='info' classNames='mli-2 align-middle'>
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
      className='mlb-4 p-2 rounded'
      label={{
        level: 2,
        children: t('empty members message'),
        className: mx('text-xl', staticDisabled),
      }}
      elevation='base'
    />
  );
};
