//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type EchoReactiveObject } from '@dxos/client/echo';
import { Input, useTranslation } from '@dxos/react-ui';

import { SPACE_PLUGIN } from '../meta';

export type DefaultObjectSettingsProps = {
  object: EchoReactiveObject<any>;
};

export const DefaultObjectSettings = ({ object }: DefaultObjectSettingsProps) => {
  const { t } = useTranslation(SPACE_PLUGIN);
  // TODO(burdon): Standardize forms.
  return (
    <div role='form' className='flex flex-col w-full p-2 gap-1'>
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
  );
};
