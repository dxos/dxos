//
// Copyright 2025 DXOS.org
//

import React from 'react';

import * as Hooks from '@dxos/react-ui/Hooks';

import { meta } from '#meta';

import { Section } from './Section.tsx';

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
  const { t } = Hooks.useTranslation(meta.profile.key);

  return (
    <Section title={t('profiles.title')}>
      {profiles.length === 0 ? (
        <p className='text-sm text-fg-muted italic'>{t('no-profiles.label')}</p>
      ) : (
        <div className='grid grid-cols-2 sm:grid-cols-3 gap-2'>
          {profiles.map((profile) => (
            <button
              key={profile.id}
              type='button'
              onClick={() => onSelect?.(profile.id)}
              className='p-3 rounded-md border border-separator text-left hover:bg-hover-surface transition-colors'
            >
              <p className='text-sm font-medium truncate'>{profile.name}</p>
              {profile.tag && <p className='text-xs text-fg-muted'>{profile.tag}</p>}
              {(profile.updatedCount ?? 0) > 0 && (
                <p className='text-xs text-accent-text mt-1'>★ {profile.updatedCount} new</p>
              )}
            </button>
          ))}
        </div>
      )}
    </Section>
  );
};
