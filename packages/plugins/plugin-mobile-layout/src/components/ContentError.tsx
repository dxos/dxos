//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { useTranslation } from '@dxos/react-ui';
import { descriptionMessage, mx } from '@dxos/react-ui-theme';

import { meta } from '../meta';

export const ContentError = ({ error }: { error?: Error }) => {
  const { t } = useTranslation(meta.id);
  const errorString = error?.toString() ?? '';
  return (
    <div role='none' className='overflow-y-auto p-8 attention-surface grid place-items-center'>
      <p role='alert' className={mx(descriptionMessage, 'break-all rounded-md p-4')}>
        {error ? errorString : t('error fallback message')}
      </p>
    </div>
  );
};
