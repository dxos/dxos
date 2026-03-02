//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { useTranslation } from '@dxos/react-ui';
import { descriptionMessage, mx } from '@dxos/ui-theme';

import { meta } from '../meta';

// TODO(burdon): Factor out.
export const ContentError = ({ error }: { error?: Error }) => {
  const { t } = useTranslation(meta.id);
  const errorString = error?.toString() ?? '';
  return (
    <div role='none' className='grid place-items-center overflow-y-auto dx-attention-surface'>
      <p role='alert' className={mx(descriptionMessage, 'p-2 break-all rounded-xs')}>
        {error ? errorString : t('error fallback message')}
      </p>
    </div>
  );
};
