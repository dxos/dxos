//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type ReactiveEchoObject } from '@dxos/react-client/echo';
import { Input, useTranslation } from '@dxos/react-ui';

import { SPACE_PLUGIN } from '../meta';

export type BaseObjectSettingsProps = {
  object: ReactiveEchoObject<any>;
};

export const BaseObjectSettings = ({ object }: BaseObjectSettingsProps) => {
  const { t } = useTranslation(SPACE_PLUGIN);
  // TODO(burdon): Standardize forms.
  return (
    <div role='form' className='flex flex-col w-full p-2 gap-1'>
      <Input.Root>
        <Input.Label>{t('name label')}</Input.Label>
        <Input.TextInput
          placeholder={t('name placeholder')}
          value={object.name ?? ''}
          onChange={(event) => {
            object.name = event.target.value;
          }}
        />
      </Input.Root>
    </div>
  );
};
