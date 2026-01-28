//
// Copyright 2025 DXOS.org
//

import React, { forwardRef, useCallback, useMemo } from 'react';

import { Common } from '@dxos/app-framework';
import { useOperationInvoker } from '@dxos/app-framework/react';
import { Obj } from '@dxos/echo';
import { useTranslation } from '@dxos/react-ui';
import { Card } from '@dxos/react-ui-mosaic';
import { Text } from '@dxos/schema';

import { meta } from '../../meta';
import { Markdown } from '../../types';
import { getContentSnippet, getFallbackName } from '../../util';
import { MarkdownEditor } from '../MarkdownEditor';

export type MarkdownCardProps = { subject: Markdown.Document | Text.Text };

export const MarkdownCard = forwardRef<HTMLDivElement, MarkdownCardProps>(
  ({ subject }: MarkdownCardProps, forwardedRef) => {
    const { invokePromise } = useOperationInvoker();
    const { t } = useTranslation(meta.id);
    const snippet = useMemo(() => getSnippet(subject), [subject]);
    const info = getInfo(subject);

    // TODO(wittjosiah): Factor out so this component isn't dependent on the app framework.
    const handleNavigate = useCallback(async () => {
      await invokePromise(Common.LayoutOperation.UpdatePopover, { state: false, anchorId: '' });
      await invokePromise(Common.LayoutOperation.Open, { subject: [Obj.getDXN(subject).toString()] });
    }, [invokePromise, subject]);

    return (
      <Card.Root ref={forwardedRef}>
        <Card.Toolbar>
          <div />
          <Card.Title classNames='flex items-center'>{getTitle(subject, t('fallback title'))}</Card.Title>
          <Card.Menu
            items={[
              {
                label: t('navigate to document label'),
                onClick: handleNavigate,
              },
            ]}
          />
        </Card.Toolbar>
        {snippet && (
          <div className='max-h-[300px] overflow-hidden'>
            <MarkdownEditor.Root id={subject.id} viewMode='readonly'>
              <MarkdownEditor.Content initialValue={snippet} slots={{}} classNames='!bg-transparent' />
            </MarkdownEditor.Root>
          </div>
        )}
        <Card.Text classNames='text-xs text-description'>
          {info.words} {t('words label', { count: info.words })}
        </Card.Text>
      </Card.Root>
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
