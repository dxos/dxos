//
// Copyright 2023 DXOS.org
//

import update from 'lodash.update';
import React, { useState } from 'react';

import { MarkdownProperties } from '@braneframe/plugin-markdown';
import { Dialog, Button, useTranslation } from '@dxos/aurora';
import { Input } from '@dxos/react-appkit';

import { useGhIdFromUrl } from '../hooks/useGhIdFromUrl';
import { GITHUB_PLUGIN } from '../props';

export const UrlDialog = ({ data: [_, properties] }: { data: [string, MarkdownProperties] }) => {
  const { t } = useTranslation(GITHUB_PLUGIN);
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
                update(properties, 'meta', (meta) => ({
                  ...meta,
                  keys: [...(meta.keys ?? []), { source: 'com.github', id: ghId }],
                }));
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
