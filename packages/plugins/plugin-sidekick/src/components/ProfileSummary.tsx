//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { meta } from '#meta';

export type ProfileSummaryProps = {
  summary?: string;
  onOpen?: () => void;
};

export const ProfileSummary = ({ summary, onOpen }: ProfileSummaryProps) => {
  const { t } = useTranslation(meta.id);
  return (
    <Form.Section label={t('user-profile.title')}>
      {summary ? (
        <button type='button' onClick={onOpen} className='text-left w-full'>
          <p className='text-sm text-description whitespace-pre-wrap line-clamp-4'>{summary}</p>
        </button>
      ) : (
        <p className='text-sm text-description italic'>{t('no-user-profile.label')}</p>
      )}
    </Form.Section>
  );
};
