//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { createIntent, LayoutAction, useIntentDispatcher } from '@dxos/app-framework';
import { isInstanceOf } from '@dxos/echo-schema';
import { fullyQualifiedId } from '@dxos/react-client/echo';
import { IconButton, useTranslation } from '@dxos/react-ui';
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
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const handleNavigate = useCallback(
    async () => dispatch(createIntent(LayoutAction.Open, { part: 'main', subject: [fullyQualifiedId(subject)] })),
    [dispatch, subject],
  );
  return (
    <div role='none' className='popover-max-width plb-3 pli-4 grid grid-cols-[1fr_min-content] gap-3 place-items-start'>
      <h2 className='text-lg font-medium line-clamp-2 min-bs-0'>{extractTitle(subject, t('fallback title'))}</h2>
      <IconButton
        iconOnly
        variant='ghost'
        onClick={handleNavigate}
        label={t('navigate to document label')}
        icon='ph--arrow-square-out--regular'
        tooltipSide='right'
      />
      {abstract && <p className='line-clamp-3 break-words col-span-2'>{abstract}</p>}
    </div>
  );
};

export default MarkdownPreview;
