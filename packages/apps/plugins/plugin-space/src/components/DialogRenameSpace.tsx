//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Button, Dialog, Input, useTranslation } from '@dxos/aurora';
import { Space } from '@dxos/react-client/echo';

export const DialogRenameSpace = ({ data: [_, space] }: { data: [string, Space] }) => {
  const { t } = useTranslation('composer');
  // todo(thure): Why does the input value need to be uncontrolled to work?
  return (
    <>
      <Dialog.Title tabIndex={-1} classNames='mbe-1'>
        {t('space name label')}
      </Dialog.Title>
      <Input.Root>
        <Input.Label srOnly>{t('space name label')}</Input.Label>
        <Input.TextInput
          defaultValue={space.properties.name ?? ''}
          placeholder={t('untitled space title')}
          onChange={({ target: { value } }) => (space.properties.name = value)}
        />
      </Input.Root>
      <Dialog.Close asChild>
        <Button classNames='mbs-2'>{t('done label', { ns: 'os' })}</Button>
      </Dialog.Close>
    </>
  );
};
