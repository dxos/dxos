//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type EchoReactiveObject } from '@dxos/echo-schema';
import { Input, useTranslation } from '@dxos/react-ui';

import { SPACE_PLUGIN } from '../meta';

type FallbackSettingsProps = {
  object: EchoReactiveObject<any>;
};

export const FallbackSettings = ({ object }: FallbackSettingsProps) => {
  const { t } = useTranslation(SPACE_PLUGIN);

  return (
    <div role='form' className='p-3 flex flex-col gap-2'>
      <div role='none' className='space-b-1'>
        <Input.Root>
          <Input.Label>{t('name label')}</Input.Label>
          <Input.TextInput
            placeholder={t('name placeholder')}
            value={object.name}
            onChange={(event) => {
              object.name = event.target.value;
            }}
          />
        </Input.Root>
      </div>
    </div>
  );
};
