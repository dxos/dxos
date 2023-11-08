//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Button, useTranslation } from '@dxos/react-ui';

import { ResolverTree } from './ResolverTree';
import { GITHUB_PLUGIN } from '../../props';

export const ResolverDialog = ({
  handleJoinSpace,
  handleCreateSpace,
}: {
  handleJoinSpace?: () => void;
  handleCreateSpace?: () => void;
}) => {
  const { t } = useTranslation(GITHUB_PLUGIN);

  return (
    <>
      <ResolverTree />
      <div role='group' className='shrink-0 flex is-full gap-2'>
        <Button classNames='grow' onClick={handleCreateSpace}>
          {t('create space label', { ns: 'appkit' })}
        </Button>
        <Button classNames='grow' onClick={handleJoinSpace}>
          {t('join space label', { ns: 'appkit' })}
        </Button>
      </div>
    </>
  );
};
