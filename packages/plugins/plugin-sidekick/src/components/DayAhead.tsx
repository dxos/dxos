//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { meta } from '#meta';

export type DayAheadProps = {
  summary?: string;
};

export const DayAhead = ({ summary }: DayAheadProps) => {
  const { t } = useTranslation(meta.id);
  return (
    <Form.Section label={t('day-ahead.title')}>
      {summary ? (
        <p className='text-sm text-description whitespace-pre-wrap'>{summary}</p>
      ) : (
        <p className='text-sm text-description italic'>{t('no-entry.label')}</p>
      )}
    </Form.Section>
  );
};
