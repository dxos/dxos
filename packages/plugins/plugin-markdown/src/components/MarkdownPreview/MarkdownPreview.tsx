//
// Copyright 2025 DXOS.org
//

import { pipe } from 'effect';
import React, { useCallback } from 'react';

import { chain, createIntent, LayoutAction, useIntentDispatcher } from '@dxos/app-framework';
import { isInstanceOf } from '@dxos/echo-schema';
import { type PreviewProps, previewCard, previewTitle, previewProse, previewChrome } from '@dxos/plugin-preview';
import { fullyQualifiedId } from '@dxos/react-client/echo';
import { Button, Icon, useTranslation } from '@dxos/react-ui';
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

  // TODO(wittjosiah): Factor out so this component isn't dependent on the app framework.
  const handleNavigate = useCallback(
    () =>
      dispatch(
        pipe(
          createIntent(LayoutAction.UpdatePopover, {
            part: 'popover',
            subject: null,
            options: { state: false, anchorId: '' },
          }),
          chain(LayoutAction.Open, { part: 'main', subject: [fullyQualifiedId(subject)] }),
        ),
      ),
    [dispatch, subject],
  );

  return (
    <div role='none' className={mx(previewCard, classNames)}>
      <h2 className={mx(previewTitle, previewProse)}>{getTitle(subject, t('fallback title'))}</h2>
      {snippet && <p className={mx(previewProse, 'line-clamp-3 break-words col-span-2')}>{snippet}</p>}
      <div role='none' className={previewChrome}>
        <Button onClick={handleNavigate}>
          <span className='grow'>{t('navigate to document label')}</span>
          <Icon icon='ph--arrow-right--regular' />
        </Button>
      </div>
    </div>
  );
};
