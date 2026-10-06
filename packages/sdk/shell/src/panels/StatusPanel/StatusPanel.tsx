//
// Copyright 2024 DXOS.org
//

import React from 'react';

import * as Hooks from '@dxos/react-ui/Hooks';
import * as Status from '@dxos/react-ui/Status';

import { translationKey } from '../../translations.ts';

export const StatusPanel = ({ titleId }: { titleId?: string }) => {
  const { t } = Hooks.useTranslation(translationKey);
  return (
    <div className='grid place-items-center p-2 gap-2'>
      <p id={titleId} className='font-medium text-center'>
        {t('resetting.message')}
      </p>
      <Status.Progress indeterminate label={t('resetting.message')} />
    </div>
  );
};
