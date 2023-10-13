//
// Copyright 2023 DXOS.org
//

import React, { useState } from 'react';

import { type MarkdownProperties } from '@braneframe/plugin-markdown';
import { Dialog, Button, useTranslation, Input } from '@dxos/aurora';

import { useGhIdFromUrl } from '../hooks';
import { GITHUB_PLUGIN } from '../props';

export const UrlDialog = ({ data: [_, properties] }: { data: [string, MarkdownProperties] }) => {
  const { t } = useTranslation(GITHUB_PLUGIN);
  const [ghUrlValue, setGhUrlValue] = useState('');

  const ghId = useGhIdFromUrl(ghUrlValue);

  return (
    <>
      <Dialog.Title classNames='mbe-2'>{t('bind to file in github label')}</Dialog.Title>
      <Input.Root validationValence='error'>
        <Input.Label>{t('paste url to file in github label')}</Input.Label>
        <Input.TextInput
          placeholder={t('paste url to file in github placeholder')}
          value={ghUrlValue}
          onChange={({ target: { value } }) => setGhUrlValue(value)}
        />
        <Input.DescriptionAndValidation>
          {ghUrlValue.length > 0 && !ghId && (
            <Input.Validation>{t('error github markdown path message')}</Input.Validation>
          )}
          <Input.Description>{t('paste url to file in github description')}</Input.Description>
        </Input.DescriptionAndValidation>
      </Input.Root>
      <div role='none' className='flex justify-end gap-2'>
        <Dialog.Close asChild>
          <Button
            classNames='mbs-2'
            onClick={() => {
              if (ghId && document) {
                properties.__meta.keys.push({ source: 'github.com', id: ghId });
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
