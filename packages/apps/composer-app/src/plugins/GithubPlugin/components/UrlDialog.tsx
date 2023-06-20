//
// Copyright 2023 DXOS.org
//

import React, { useState } from 'react';

import { Dialog, Button, useTranslation } from '@dxos/aurora';
import { Input } from '@dxos/react-appkit';

import { MarkdownProperties } from '../../MarkdownPlugin/components';
import { useGhIdFromUrl } from '../hooks/useGhIdFromUrl';

export const UrlDialog = ({ data }: { data: any }) => {
  const [_, properties]: [string, MarkdownProperties] = data;
  const { t } = useTranslation('plugin-github');
  const [ghUrlValue, setGhUrlValue] = useState('');

  const ghId = useGhIdFromUrl(ghUrlValue);

  return (
    <>
      <Dialog.Title classNames='mbe-2'>{t('bind to file in github label')}</Dialog.Title>
      <Input
        label={t('paste url to file in github label')}
        description={t('paste url to file in github description')}
        placeholder={t('paste url to file in github placeholder')}
        value={ghUrlValue}
        onChange={({ target: { value } }) => setGhUrlValue(value)}
        {...(ghUrlValue.length > 0 &&
          !ghId && {
            validationValence: 'error',
            validationMessage: t('error github markdown path message'),
          })}
      />
      <div role='none' className='flex justify-end gap-2'>
        <Dialog.Close asChild>
          <Button
            classNames='mbs-2'
            onClick={() => {
              if (ghId && document) {
                const key = { source: 'com.github', id: ghId };
                properties.keys = [key];
              }
            }}
          >
            {t('done label', { ns: 'os' })}
          </Button>
        </Dialog.Close>
      </div>
    </>
  );
};
