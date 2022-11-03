//
// Copyright 2022 DXOS.org
//
import React from 'react';

import type { Profile } from '@dxos/client';
import { Avatar, useTranslation } from '@dxos/react-uikit';
import { humanize } from '@dxos/util';

export interface ProfileListProps {
  profiles: Profile[];
}

export const ProfileList = ({ profiles }: ProfileListProps) => {
  const { t } = useTranslation('halo');
  return profiles.length > 0 ? (
    <ul>
      {profiles.map((profile) => {
        const profileHex = profile.publicKey.toHex();
        return (
          <li key={profileHex}>
            <Avatar fallbackValue={profileHex} label={humanize(profileHex)} />
          </li>
        );
      })}
    </ul>
  ) : (
    <p className='text-center'>{t('empty space message')}</p>
  );
};
