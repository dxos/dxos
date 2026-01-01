//
// Copyright 2025 DXOS.org
//

import * as Function from 'effect/Function';
import React, { forwardRef, useCallback, useMemo } from 'react';

import { LayoutAction, chain, createIntent } from '@dxos/app-framework';
import { useIntentDispatcher } from '@dxos/app-framework/react';
import { Obj } from '@dxos/echo';
import { type CardPreviewProps } from '@dxos/plugin-preview';
import { IconButton, useTranslation } from '@dxos/react-ui';
import { Card } from '@dxos/react-ui-mosaic';
import { Text } from '@dxos/schema';

import { meta } from '../../meta';
import { Markdown } from '../../types';
import { getContentSnippet, getFallbackName } from '../../util';
import { MarkdownEditor } from '../MarkdownEditor';

export type MarkdownCardProps = CardPreviewProps<Markdown.Document | Text.Text>;

export const MarkdownCard = forwardRef<HTMLDivElement, MarkdownCardProps>(
  ({ subject, role }: MarkdownCardProps, forwardedRef) => {
    const { dispatchPromise: dispatch } = useIntentDispatcher();
    const { t } = useTranslation(meta.id);
    const snippet = useMemo(() => getSnippet(subject), [subject]);
    const info = getInfo(subject);

    // TODO(wittjosiah): Factor out so this component isn't dependent on the app framework.
    const handleNavigate = useCallback(() => {
      void dispatch(
        Function.pipe(
          createIntent(LayoutAction.UpdatePopover, {
            part: 'popover',
            subject: null,
            options: { state: false, anchorId: '' },
          }),
          chain(LayoutAction.Open, {
            part: 'main',
            subject: [Obj.getDXN(subject).toString()],
          }),
        ),
      );
    }, [dispatch, subject]);

    return (
      <Card.SurfaceRoot role={role} ref={forwardedRef}>
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
        {snippet && (
          <Card.Text classNames='flex max-h-[300px] overflow-hidden'>
            <MarkdownEditor.Root id={subject.id} viewMode='readonly'>
              <MarkdownEditor.Content initialValue={snippet} slots={{}} classNames='!bg-transparent' />
            </MarkdownEditor.Root>
          </Card.Text>
        )}
        <Card.Text classNames='text-xs text-description'>
          {info.words} {t('words label', { count: info.words })}
        </Card.Text>
      </Card.SurfaceRoot>
    );
  },
);

const getInfo = (subject: Markdown.Document | Text.Text) => {
  const text = (Obj.instanceOf(Markdown.Document, subject) ? subject.content?.target?.content : subject.content) ?? '';
  return { words: text.split(' ').length };
};

// TODO(burdon): Factor out.
const getTitle = (subject: Markdown.Document | Text.Text, fallback: string) => {
  if (Obj.instanceOf(Markdown.Document, subject)) {
    const title = Obj.getLabel(subject);
    return title ?? getFallbackName(subject.content?.target?.content ?? fallback);
  } else if (Obj.instanceOf(Text.Text, subject)) {
    return getFallbackName(subject.content);
  }
};

// TODO(burdon): Factor out.
const getSnippet = (subject: Markdown.Document | Text.Text, fallback?: string) => {
  if (Obj.instanceOf(Markdown.Document, subject)) {
    return Obj.getDescription(subject) || getContentSnippet(subject.content?.target?.content ?? fallback);
  } else if (Obj.instanceOf(Text.Text, subject)) {
    return getContentSnippet(subject.content ?? fallback);
  }
};
