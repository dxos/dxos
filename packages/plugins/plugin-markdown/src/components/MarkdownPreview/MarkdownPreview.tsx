//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { createIntent, LayoutAction, useIntentDispatcher } from '@dxos/app-framework';
import { isInstanceOf } from '@dxos/echo-schema';
import { type PreviewProps, previewCard, previewTitle } from '@dxos/plugin-preview';
import { fullyQualifiedId } from '@dxos/react-client/echo';
import { IconButton, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { TextType } from '@dxos/schema';

import { MARKDOWN_PLUGIN } from '../../meta';
import { DocumentType } from '../../types';
import { getAbstract, getFallbackName } from '../../util';

// TODO(burdon): Factor out.
const getTitle = (subject: DocumentType | TextType, fallback: string) => {
  if (isInstanceOf(DocumentType, subject)) {
    return subject.name ?? subject.fallbackName ?? getFallbackName(subject.content?.target?.content ?? fallback);
  } else if (isInstanceOf(TextType, subject)) {
    return getFallbackName(subject.content);
  }
};

// TODO(burdon): Factor out.
const getSnippet = (subject: DocumentType | TextType, fallback: string) => {
  if (isInstanceOf(DocumentType, subject)) {
    return getAbstract(subject.content?.target?.content ?? fallback);
  } else if (isInstanceOf(TextType, subject)) {
    return getAbstract(subject.content);
  }
};

export const MarkdownPreview = ({ classNames, subject }: PreviewProps<DocumentType | TextType>) => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const { t } = useTranslation(MARKDOWN_PLUGIN);
  const snippet = getSnippet(subject, t('fallback abstract'));

  const handleNavigate = useCallback(
    async () => dispatch(createIntent(LayoutAction.Open, { part: 'main', subject: [fullyQualifiedId(subject)] })),
    [dispatch, subject],
  );

  return (
    <div
      role='none'
      className={mx('grid grid-cols-[1fr_min-content] plb-3 pli-3 gap-3 place-items-start', previewCard, classNames)}
    >
      <h2 className={previewTitle}>{getTitle(subject, t('fallback title'))}</h2>
      <IconButton
        iconOnly
        variant='ghost'
        size={4}
        label={t('navigate to document label')}
        icon='ph--arrow-square-out--regular'
        tooltipSide='right'
        onClick={handleNavigate}
      />
      {snippet && <p className='line-clamp-3 break-words col-span-2'>{snippet}</p>}
    </div>
  );
};
