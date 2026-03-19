//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { Obj } from '@dxos/echo';
import { useTranslation } from '@dxos/react-ui';
import { Card } from '@dxos/react-ui';
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

  // TODO(burdon): Standardize px-1.
  return (
    <Card.Content>
      {snippet && (
        <Card.Section className='px-1'>
          <MarkdownEditor.Root id={subject.id} viewMode='readonly'>
            <MarkdownEditor.Content
              initialValue={snippet}
              classNames='bg-transparent'
              slots={{
                editor: { className: 'max-h-[240px]' },
              }}
            />
          </MarkdownEditor.Root>
        </Card.Section>
      )}
      <Card.Section>
        <Card.Text classNames='px-1.5 text-xs text-description'>
          {info.words} {t('words label', { count: info.words })}
        </Card.Text>
      </Card.Section>
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
