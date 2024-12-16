//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { SPACE_PLUGIN } from '@dxos/plugin-space/meta';
import { Input, useTranslation } from '@dxos/react-ui';

import { RangeList } from './RangeList';
import { type SheetType } from '../types';

export type SheetObjectSettingsProps = {
  sheet: SheetType;
};

export const SheetObjectSettings = ({ sheet }: SheetObjectSettingsProps) => {
  const { t } = useTranslation(SPACE_PLUGIN);

  // TODO(burdon): Standardize forms.
  return (
    <>
      <div role='form' className='flex flex-col w-full p-2 gap-1'>
        <Input.Root>
          <Input.Label>{t('name label')}</Input.Label>
          <Input.TextInput
            placeholder={t('name placeholder')}
            value={sheet.name ?? ''}
            onChange={(event) => {
              sheet.name = event.target.value;
            }}
          />
        </Input.Root>
      </div>
      <RangeList sheet={sheet} />
    </>
  );
};
