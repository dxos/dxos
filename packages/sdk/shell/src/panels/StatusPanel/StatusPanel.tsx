//
// Copyright 2024 DXOS.org
//

import React from 'react';

import * as Hooks from '@dxos/react-ui/Hooks';
import * as Progress from '@dxos/react-ui/Progress';

import { translationKey } from '../../translations.ts';

export const StatusPanel = ({ titleId }: { titleId?: string }) => {
  const { t } = Hooks.useTranslation(translationKey);
  return (
    <div className='grid place-items-center p-2 gap-2'>
      <p id={titleId} className='font-medium text-center'>
        {t('resetting.message')}
      </p>
      <Progress.Root indeterminate>{t('resetting.message')}</Progress.Root>
    </div>
  );
};
