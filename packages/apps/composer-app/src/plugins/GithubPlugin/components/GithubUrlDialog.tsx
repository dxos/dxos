//
// Copyright 2023 DXOS.org
//

import React, { useMemo, useState } from 'react';

import { Dialog, Button, useTranslation } from '@dxos/aurora';
import { Input } from '@dxos/react-appkit';

import { MarkdownProperties } from '../../MarkdownPlugin/components';

export const GithubUrlDialog = ({ data }: { data: any }) => {
  const [_, properties]: [string, MarkdownProperties] = data;
  const { t } = useTranslation('plugin-github');
  const [ghUrlValue, setGhUrlValue] = useState('');

  const ghId = useMemo<string | null>(() => {
    try {
      const url = new URL(ghUrlValue);
      const [_, owner, repo, type, ...rest] = url.pathname.split('/');
      if (type === 'blob') {
        const [ref, ...pathParts] = rest;
        const path = pathParts.join('/');
        const ext = pathParts[pathParts.length - 1].split('.')[1];
        return ext === 'md' ? `${owner}/${repo}/blob/${ref}/${path}` : null;
      } else if (type === 'issues') {
        const [issueNumberString] = rest;
        return `${owner}/${repo}/issues/${issueNumberString}`;
      } else {
        return null;
      }
    } catch (e) {
      return null;
    }
  }, [ghUrlValue]);

  return (
    <>
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
    </>
  );
};
