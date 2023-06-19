//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Button, useTranslation } from '@dxos/aurora';
import { defaultDescription, mx } from '@dxos/aurora-theme';
import { GraphNode } from '@dxos/react-surface';

import { LocalFile } from '../LocalFilesPlugin';

export const LocalFileMainPermissions = ({ data }: { data: GraphNode<LocalFile> }) => {
  const { t } = useTranslation('composer');
  const action = data.actions?.find(({ id }) => id === 're-open');
  return (
    <div role='none' className='min-bs-screen is-full flex items-center justify-center p-8'>
      <p
        role='alert'
        className={mx(
          defaultDescription,
          'border border-dashed border-neutral-400/50 rounded-xl flex items-center justify-center p-8 font-system-normal text-lg',
        )}
      >
        {t('missing file permissions')}
        {action && (
          <Button onClick={(event) => action.invoke(t, event)}>
            {Array.isArray(action.label) ? t(...action.label) : action.label}
          </Button>
        )}
      </p>
    </div>
  );
};
