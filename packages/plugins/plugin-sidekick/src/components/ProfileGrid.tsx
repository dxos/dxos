//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { meta } from '#meta';

export type ProfileCardData = {
  id: string;
  name: string;
  tag?: string;
  updatedCount?: number;
};

export type ProfileGridProps = {
  profiles: ProfileCardData[];
  onSelect?: (profileId: string) => void;
};

export const ProfileGrid = ({ profiles, onSelect }: ProfileGridProps) => {
  const { t } = useTranslation(meta.id);

  return (
    <Form.Section label={t('profiles.title')}>
      {profiles.length === 0 ? (
        <p className='text-sm text-description italic'>{t('no-profiles.label')}</p>
      ) : (
        <div className='grid grid-cols-2 sm:grid-cols-3 gap-2'>
          {profiles.map((profile) => (
            <button
              key={profile.id}
              onClick={() => onSelect?.(profile.id)}
              className='p-3 rounded-md border border-separator text-left hover:bg-hoverSurface transition-colors'
            >
              <p className='text-sm font-medium truncate'>{profile.name}</p>
              {profile.tag && <p className='text-xs text-description'>{profile.tag}</p>}
              {(profile.updatedCount ?? 0) > 0 && (
                <p className='text-xs text-accentText mt-1'>★ {profile.updatedCount} new</p>
              )}
            </button>
          ))}
        </div>
      )}
    </Form.Section>
  );
};
