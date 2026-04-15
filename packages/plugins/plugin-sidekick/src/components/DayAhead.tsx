//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';

export type DayAheadProps = {
  summary?: string;
  classNames?: string;
};

export const DayAhead = ({ summary, classNames }: DayAheadProps) => {
  const { t } = useTranslation(meta.id);
  return (
    <div className={classNames}>
      {summary ? (
        <p className='text-sm text-description whitespace-pre-wrap'>{summary}</p>
      ) : (
        <p className='text-sm text-description italic'>{t('no-entry.label')}</p>
      )}
    </div>
  );
};
