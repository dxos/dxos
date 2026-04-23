//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { Obj } from '@dxos/echo';
import { Card, useTranslation } from '@dxos/react-ui';
import { Editor } from '@dxos/react-ui-editor';
import { Text } from '@dxos/schema';

import { MarkdownEditor, MarkdownEditorProvider } from '#components';
import { meta } from '#meta';
import { Markdown } from '#types';

import { getContentSnippet } from '../../util';
import { snippet as snippetExtension } from './snippet';

export type MarkdownCardProps = { subject: Markdown.Document | Text.Text };

export const MarkdownCard = ({ subject }: MarkdownCardProps) => {
  const { t } = useTranslation(meta.id);
  const snippet = useMemo(() => getSnippet(subject), [subject]);
  const extensions = useMemo(() => [snippetExtension({ height: 200, scale: 0.8 })], []);
  const info = getInfo(subject);

  return (
    <Card.Content>
      {snippet && (
        <Card.Section className='px-1'>
          <MarkdownEditorProvider id={subject.id} viewMode='readonly' extensions={extensions}>
            {(editorRootProps) => (
              <Editor.Root {...editorRootProps}>
                <MarkdownEditor.Content initialValue={snippet} slots={{ content: { className: 'm-0' } }} />
                <div
                  role='none'
                  data-visible={overflow}
                  className={mx(
                    // NOTE: Gradients may not be visible with dark reader extensions.
                    'z-10 absolute top-0 inset-x-0 h-24 w-full',
                    'opacity-0 duration-200 transition-opacity data-[visible="true"]:opacity-100',
                    'bg-gradient-to-b from-(--surface-bg) to-transparent pointer-events-none',
                  )}
                />
              </Editor.Root>
            )}
          </MarkdownEditorProvider>
        </Card.Section>
      )}
      <Card.Section>
        <Card.Text classNames='px-1.5 text-xs text-description'>
          {info.words} {t('words.label', { count: info.words })}
        </Card.Text>
      </Card.Section>
    </Card.Content>
  );
};

const getSnippet = (subject: Markdown.Document | Text.Text, fallback?: string, maxLines = 16) => {
  if (Obj.instanceOf(Markdown.Document, subject)) {
    return Obj.getDescription(subject) || getContentSnippet(subject.content?.target?.content ?? fallback, maxLines);
  } else if (Obj.instanceOf(Text.Text, subject)) {
    return getContentSnippet(subject.content ?? fallback, maxLines);
  }
};

const getInfo = (subject: Markdown.Document | Text.Text) => {
  const text = (Obj.instanceOf(Markdown.Document, subject) ? subject.content?.target?.content : subject.content) ?? '';
  return { words: text.split(' ').length };
};
