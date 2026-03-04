//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { Obj } from '@dxos/echo';
import { useTranslation } from '@dxos/react-ui';
import { Card } from '@dxos/react-ui-mosaic';
import { Text } from '@dxos/schema';

import { MarkdownEditor } from '../../components';
import { meta } from '../../meta';
import { Markdown } from '../../types';
import { getContentSnippet } from '../../util';

export type MarkdownCardProps = { subject: Markdown.Document | Text.Text };

export const MarkdownCard = ({ subject }: MarkdownCardProps) => {
  const { t } = useTranslation(meta.id);
  const snippet = useMemo(() => getSnippet(subject), [subject]);
  const info = getInfo(subject);

  return (
    <Card.Content>
      {snippet && (
        <Card.Row classNames='overflow-hidden'>
          <MarkdownEditor.Root id={subject.id}>
            <MarkdownEditor.Content
              viewMode='readonly'
              initialValue={snippet}
              classNames='p-0'
              slots={{
                editor: { className: 'max-h-[240px]' },
                content: { className: 'bg-transparent' },
              }}
            />
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

const MAX_LINES = 5;

const getSnippet = (subject: Markdown.Document | Text.Text, fallback?: string) => {
  if (Obj.instanceOf(Markdown.Document, subject)) {
    return Obj.getDescription(subject) || getContentSnippet(subject.content?.target?.content ?? fallback, MAX_LINES);
  } else if (Obj.instanceOf(Text.Text, subject)) {
    return getContentSnippet(subject.content ?? fallback, MAX_LINES);
  }
};

const getInfo = (subject: Markdown.Document | Text.Text) => {
  const text = (Obj.instanceOf(Markdown.Document, subject) ? subject.content?.target?.content : subject.content) ?? '';
  return { words: text.split(' ').length };
};
