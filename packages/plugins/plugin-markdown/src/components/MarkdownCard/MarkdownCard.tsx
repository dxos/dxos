//
// Copyright 2025 DXOS.org
//

import * as Function from 'effect/Function';
import React, { useCallback } from 'react';

import { LayoutAction, chain, createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { type PreviewProps } from '@dxos/plugin-preview';
import { fullyQualifiedId } from '@dxos/react-client/echo';
import { IconButton, useTranslation } from '@dxos/react-ui';
import { Card } from '@dxos/react-ui-stack';
import { DataType } from '@dxos/schema';

import { meta } from '../../meta';
import { Markdown } from '../../types';
import { getContentSnippet, getFallbackName } from '../../util';

export type MarkdownCardProps = PreviewProps<Markdown.Document | DataType.Text.Text>;

export const MarkdownCard = ({ subject, role }: MarkdownCardProps) => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const { t } = useTranslation(meta.id);
  const snippet = getSnippet(subject, t('fallback abstract'));
  const info = getInfo(subject);

  // TODO(wittjosiah): Factor out so this component isn't dependent on the app framework.
  const handleNavigate = useCallback(
    () =>
      dispatch(
        Function.pipe(
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
    <Card.SurfaceRoot role={role}>
      <Card.Heading classNames='flex items-center'>
        {getTitle(subject, t('fallback title'))}
        <span className='grow' />
        <IconButton
          iconOnly
          icon='ph--arrow-right--regular'
          label={t('navigate to document label')}
          onClick={handleNavigate}
        />
      </Card.Heading>
      {snippet && <Card.Text classNames='line-clamp-3 text-sm text-description'>{snippet}</Card.Text>}
      <Card.Text classNames='text-xs text-description'>
        {info.words} {t('words label', { count: info.words })}
      </Card.Text>
    </Card.SurfaceRoot>
  );
};

const getInfo = (subject: Markdown.Document | DataType.Text.Text) => {
  const text = (Obj.instanceOf(Markdown.Document, subject) ? subject.content?.target?.content : subject.content) ?? '';
  return { words: text.split(' ').length };
};

// TODO(burdon): Factor out.
const getTitle = (subject: Markdown.Document | DataType.Text.Text, fallback: string) => {
  if (Obj.instanceOf(Markdown.Document, subject)) {
    return subject.name ?? subject.fallbackName ?? getFallbackName(subject.content?.target?.content ?? fallback);
  } else if (Obj.instanceOf(DataType.Text.Text, subject)) {
    return getFallbackName(subject.content);
  }
};

// TODO(burdon): Factor out.
const getSnippet = (subject: Markdown.Document | DataType.Text.Text, fallback: string) => {
  if (Obj.instanceOf(Markdown.Document, subject)) {
    return Obj.getDescription(subject) || getContentSnippet(subject.content?.target?.content ?? fallback);
  } else if (Obj.instanceOf(DataType.Text.Text, subject)) {
    return getContentSnippet(subject.content ?? fallback);
  }
};
