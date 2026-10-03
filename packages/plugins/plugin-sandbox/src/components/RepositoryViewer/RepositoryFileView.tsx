//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { useTranslation } from '@dxos/react-ui';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';

import { meta } from '#meta';

import type { RepositoryFile } from '../../services/RepositoryClient.ts';
import { imageTypeForPath, languageForPath } from './languages.ts';

export type RepositoryFileViewProps = {
  file: RepositoryFile;
};

/** One file at a commit: highlighted text, an image, or a note that the file is binary. */
export const RepositoryFileView = ({ file }: RepositoryFileViewProps) => {
  const { t } = useTranslation(meta.profile.key);
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
    <div className='dx-expand grid place-items-center overflow-auto p-4'>
      <img src={`data:${imageType};base64,${file.content}`} alt={file.path} className='max-w-full' />
    </div>
  ) : (
    <div className='dx-expand grid place-items-center p-4 text-description'>
      {t('binary-file.message', { size: file.size })}
    </div>
  );
};
