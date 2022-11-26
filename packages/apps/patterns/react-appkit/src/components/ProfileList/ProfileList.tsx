//
// Copyright 2022 DXOS.org
//
import cx from 'classnames';
import React from 'react';

import type { Profile } from '@dxos/client';
import { useIdentity } from '@dxos/react-client';
import { Avatar, defaultDisabled, defaultGroup, Group } from '@dxos/react-ui';
import { useTranslation, Tag } from '@dxos/react-uikit';
import { humanize } from '@dxos/util';

export interface ProfileListProps {
  profiles: Profile[];
}

export const ProfileList = ({ profiles }: ProfileListProps) => {
  const { t } = useTranslation('appkit');
  const identity = useIdentity();
  const identityHex = identity?.identityKey.toHex();
  return profiles.length > 0 ? (
    <ul className='flex flex-col gap-2 mlb-4'>
      {profiles.map((profile) => {
        const profileHex = profile.identityKey.toHex();
        return (
          <li
            key={profileHex}
            className={cx(
              defaultGroup({ elevation: 1, spacing: 'p-1', rounding: 'rounded' }),
              'flex gap-2 items-center'
            )}
          >
            <Avatar
              variant='circle'
              fallbackValue={profileHex}
              label={
                <p>
                  {profile.displayName ?? humanize(profileHex)}
                  {profileHex === identityHex && (
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
        className: cx('text-xl', defaultDisabled)
      }}
      elevation={0}
    />
  );
};
