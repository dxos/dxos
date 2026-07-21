//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/react-client/echo';
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
  const { t } = useTranslation(meta.profile.key);
  // Subscribe to the live content so the snippet + word count track edits (e.g. an agent updating
  // the document); reading `subject.content.target.content` alone is not reactive to the string.
  const [docContent] = useObject(Obj.instanceOf(Markdown.Document, subject) ? subject.content : undefined, 'content');
  const [textContent] = useObject(Obj.instanceOf(Text.Text, subject) ? subject : undefined, 'content');
  // NOTE: Newline is added so that Fade does not obscure the last line.
  const snippet = useMemo(() => getSnippet(subject) + '\n', [subject, docContent, textContent]);
  const extensions = useMemo(() => [snippetExtension({ height: 300, scale: 0.8 })], []);
  const info = getInfo(subject);

  return (
    <Card.Body>
      {snippet && (
        <Card.Section className='aspect-square relative'>
          <Card.Row fullWidth>
            {/* Re-seed the readonly snippet when the content changes (the editor takes `initialValue`
                at mount only). Keyed on the snippet so agent/remote edits are reflected. */}
            <MarkdownEditorProvider key={snippet} id={subject.id} viewMode='readonly' extensions={extensions}>
              {(editorRootProps) => (
                <Editor.Root {...editorRootProps}>
                  <MarkdownEditor.Content initialValue={snippet} slots={{ content: { className: 'px-2!' } }} compact />
                </Editor.Root>
              )}
            </MarkdownEditorProvider>
            <Fade />
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
      'z-10 absolute bottom-0 inset-x-0 h-6 w-full',
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

MarkdownCard.displayName = 'MarkdownCard';
