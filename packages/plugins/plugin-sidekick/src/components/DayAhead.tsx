//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';

import { Section } from './Section';

export type DayAheadProps = {
  summary?: string;
};

export const DayAhead = ({ summary }: DayAheadProps) => {
  const { t } = useTranslation(meta.profile.key);
  return (
    <Section title={t('day-ahead.title')}>
      {summary ? (
        <p className='text-sm text-description whitespace-pre-wrap'>{summary}</p>
      ) : (
        <p className='text-sm text-description italic'>{t('no-entry.label')}</p>
      )}
    </Section>
  );
};
