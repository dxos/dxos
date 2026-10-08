//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';

import { meta } from '#meta';

import type { RepositoryFile } from '../../services/RepositoryClient.ts';
import { imageTypeForPath, languageForPath } from './languages.ts';

export type RepositoryFileViewProps = {
  file: RepositoryFile;
};

/** One file at a commit: highlighted text, an image, or a note that the file is binary. */
export const RepositoryFileView = ({ file }: RepositoryFileViewProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  if (file.encoding === 'utf-8') {
    return (
      <SyntaxHighlighter
        language={languageForPath(file.path)}
        classNames='dx-expand text-sm bg-transparent'
        showLineNumbers
        copyButton
      >
        {file.content}
      </SyntaxHighlighter>
    );
  }

  const imageType = imageTypeForPath(file.path);
  return imageType ? (
    <Layout.Grid grow center classNames='overflow-auto p-4'>
      <img src={`data:${imageType};base64,${file.content}`} alt={file.path} className='max-w-full' />
    </Layout.Grid>
  ) : (
    <Layout.Grid grow center classNames='p-4 text-fg-muted'>
      {t('binary-file.message', { size: file.size })}
    </Layout.Grid>
  );
};
