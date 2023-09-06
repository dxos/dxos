//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Button, Input, Popover, useTranslation } from '@dxos/aurora';
import { TypedObject } from '@dxos/react-client/echo';

import { SPACE_PLUGIN } from '../types';

export const PopoverRenameObject = ({ data: [_, object] }: { data: [string, TypedObject] }) => {
  const { t } = useTranslation(SPACE_PLUGIN);
  // todo(thure): Why does the input value need to be uncontrolled to work?
  return (
    <div role='none' className='p-1 flex gap-2'>
      <div role='none' className='flex-1'>
        <Input.Root>
          <Input.Label srOnly>{t('space name label')}</Input.Label>
          <Input.TextInput
            defaultValue={object.title ?? ''}
            placeholder={t('object title placeholder')}
            onChange={({ target: { value } }) => (object.title = value)}
          />
        </Input.Root>
      </div>
      <Popover.Close asChild>
        <Button classNames='self-stretch'>{t('done label', { ns: 'os' })}</Button>
      </Popover.Close>
    </div>
  );
};
