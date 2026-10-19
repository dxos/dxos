//
// Copyright 2025 DXOS.org
//

import React from 'react';

import * as Hooks from '@dxos/react-ui/Hooks';

import { meta } from '#meta';

import { Section } from './Section.tsx';

export type ProfileSummaryProps = {
  summary?: string;
  onOpen?: () => void;
};

export const ProfileSummary = ({ summary, onOpen }: ProfileSummaryProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  return (
    <Section title={t('user-profile.title')}>
      {summary ? (
        <button type='button' onClick={onOpen} className='text-left w-full'>
          <p className='text-sm text-fg-muted whitespace-pre-wrap line-clamp-4'>{summary}</p>
        </button>
      ) : (
        <p className='text-sm text-fg-muted italic'>{t('no-user-profile.label')}</p>
      )}
    </Section>
  );
};
