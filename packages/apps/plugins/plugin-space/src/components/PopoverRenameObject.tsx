//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Button, Input, Popover, useTranslation } from '@dxos/aurora';
import { TypedObject } from '@dxos/react-client/echo';

import { SPACE_PLUGIN } from '../types';

export const PopoverRenameObject = ({ data: [_, object] }: { data: [string, TypedObject] }) => {
  const { t } = useTranslation(SPACE_PLUGIN);

  return (
    <div role='none' className='p-1 flex gap-2'>
      <div role='none' className='flex-1'>
        <Input.Root>
          <Input.Label srOnly>{t('space name label')}</Input.Label>
          <Input.TextInput
            placeholder={t('object title placeholder')}
            // TODO(thure): Why does the input value need to be uncontrolled to work?
            defaultValue={object.title ?? ''}
            // TODO(burdon): Field should not be hard-code 'title' field.
            onChange={({ target: { value } }) => (object.title = value)}
            // onKeyDown={({ key }) => key === 'Enter' && console.log('close')}
          />
        </Input.Root>
      </div>
      <Popover.Close asChild>
        <Button classNames='self-stretch'>{t('done label', { ns: 'os' })}</Button>
      </Popover.Close>
    </div>
  );
};
