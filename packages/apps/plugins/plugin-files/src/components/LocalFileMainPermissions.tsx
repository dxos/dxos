//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { GraphNode, useGraph } from '@braneframe/plugin-graph';
import { Button, useTranslation } from '@dxos/aurora';
import { descriptionText, mx } from '@dxos/aurora-theme';

import { FILES_PLUGIN, LocalEntity } from '../types';

export const LocalFileMainPermissions = ({ data }: { data: GraphNode<LocalEntity> }) => {
  const { t } = useTranslation(FILES_PLUGIN);
  const { invokeAction } = useGraph();
  const action = data.pluginActions?.[FILES_PLUGIN]?.find(({ id }) => id === 're-open');
  return (
    <div role='none' className='min-bs-screen is-full flex items-center justify-center p-8'>
      <p
        role='alert'
        className={mx(
          descriptionText,
          'border border-dashed border-neutral-400/50 rounded-xl flex flex-col space-items-evenly justify-center p-8 font-system-normal text-lg',
        )}
      >
        {t('missing file permissions')}
        {action && (
          <Button onClick={() => invokeAction(action)}>
            {Array.isArray(action.label) ? t(...action.label) : action.label}
          </Button>
        )}
      </p>
    </div>
  );
};
