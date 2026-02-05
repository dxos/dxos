//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { Obj } from '@dxos/echo';
import { useTranslation } from '@dxos/react-ui';
import { Card } from '@dxos/react-ui-mosaic';
import { Text } from '@dxos/schema';

import { meta } from '../../meta';
import { Markdown } from '../../types';
import { getContentSnippet, getFallbackName } from '../../util';
import { MarkdownEditor } from '../MarkdownEditor';

export type MarkdownCardProps = { subject: Markdown.Document | Text.Text };

export const MarkdownCard = ({ subject }: MarkdownCardProps) => {
  const { t } = useTranslation(meta.id);
  const snippet = useMemo(() => getSnippet(subject), [subject]);
  const info = getInfo(subject);

  return (
    <Card.Content>
      {snippet && (
        <Card.Row className='max-h-[300px] overflow-hidden'>
          <MarkdownEditor.Root id={subject.id} viewMode='readonly'>
            <MarkdownEditor.Content initialValue={snippet} slots={{}} classNames='!bg-transparent' />
          </MarkdownEditor.Root>
        </Card.Row>
      )}
      <Card.Row>
        <Card.Text classNames='text-xs text-description'>
          {info.words} {t('words label', { count: info.words })}
        </Card.Text>
      </Card.Row>
    </Card.Content>
  );
};

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
