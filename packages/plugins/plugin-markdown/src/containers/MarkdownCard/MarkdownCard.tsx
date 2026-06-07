//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { Obj } from '@dxos/echo';
import { Card, useTranslation } from '@dxos/react-ui';
import { Editor } from '@dxos/react-ui-editor';
import { Text } from '@dxos/schema';
import { mx } from '@dxos/ui-theme';

import { MarkdownEditor, MarkdownEditorProvider } from '#components';
import { meta } from '#meta';
import { Markdown } from '#types';

import { getContentSnippet } from '../../util';
import { snippet as snippetExtension } from './snippet';

export type MarkdownCardProps = { subject: Markdown.Document | Text.Text };

export const MarkdownCard = ({ subject }: MarkdownCardProps) => {
  const { t } = useTranslation(meta.id);
  const snippet = useMemo(() => getSnippet(subject), [subject]);
  const extensions = useMemo(() => [snippetExtension({ height: 300, scale: 0.8 })], []);
  const info = getInfo(subject);

  return (
    <Card.Body>
      {snippet && (
        <Card.Section className='relative'>
          <Card.Row fullWidth>
            <MarkdownEditorProvider id={subject.id} viewMode='readonly' extensions={extensions}>
              {(editorRootProps) => (
                <Editor.Root {...editorRootProps}>
                  <MarkdownEditor.Content initialValue={snippet} slots={{ content: { className: 'px-2!' } }} compact />
                </Editor.Root>
              )}
            </MarkdownEditorProvider>
            {/* TODO(burdon): Only show fade if truncated. */}
            {/* <Fade /> */}
          </Card.Row>
        </Card.Section>
      )}
      <Card.Section>
        <Card.Row fullWidth>
          <Card.Text classNames='px-2 text-xs text-description'>
            {info.words} {t('words.label', { count: info.words })}
          </Card.Text>
        </Card.Row>
      </Card.Section>
    </Card.Body>
  );
};

const Fade = () => (
  <div
    className={mx(
      'z-10 absolute bottom-0 inset-x-0 h-12 w-full',
      'bg-gradient-to-b from-transparent to-(--surface-bg) pointer-events-none',
    )}
  />
);

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
