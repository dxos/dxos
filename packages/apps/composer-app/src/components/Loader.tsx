//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type PluginDefinition } from '@dxos/app-framework';
import { Status, useTranslation } from '@dxos/react-ui';

export const Loader = ({ plugin }: { plugin?: PluginDefinition['meta'] }) => {
  const { t } = useTranslation('composer');

  return (
    <div className='flex bs-[100dvh] justify-center items-center'>
      {plugin && t('slow plugin label', { plugin: plugin.name ?? plugin.id })}
      <Status indeterminate aria-label='Initializing' />
    </div>
  );
};
