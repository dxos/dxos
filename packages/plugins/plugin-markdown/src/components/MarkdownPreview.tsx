//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { isInstanceOf } from '@dxos/echo-schema';
import { useTranslation } from '@dxos/react-ui';
import { TextType } from '@dxos/schema';

import { MARKDOWN_PLUGIN } from '../meta';
import { DocumentType } from '../types';
import { getAbstract, getFallbackName } from '../util';

const extractTitle = (subject: DocumentType | TextType, fallback: string) => {
  if (isInstanceOf(DocumentType, subject)) {
    return subject.name ?? subject.fallbackName ?? getFallbackName(subject.content?.target?.content ?? fallback);
  } else if (isInstanceOf(TextType, subject)) {
    return getFallbackName(subject.content);
  }
};

const extractAbstract = (subject: DocumentType | TextType, fallback: string) => {
  if (isInstanceOf(DocumentType, subject)) {
    return getAbstract(subject.content?.target?.content ?? fallback);
  } else if (isInstanceOf(TextType, subject)) {
    return getAbstract(subject.content);
  }
};

export const MarkdownPreview = ({ data: { subject } }: { data: { subject: DocumentType | TextType } }) => {
  const { t } = useTranslation(MARKDOWN_PLUGIN);
  const abstract = extractAbstract(subject, t('fallback abstract'));
  return (
    <div role='none' className='popover-max-width'>
      <h2 className='text-xl line-clamp-2'>{extractTitle(subject, t('fallback title'))}</h2>
      {abstract && <p className='line-clamp-3'>{abstract}</p>}
    </div>
  );
};

export default MarkdownPreview;
