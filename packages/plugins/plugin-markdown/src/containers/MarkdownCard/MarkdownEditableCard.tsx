//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/react-client/echo';
import { Card } from '@dxos/react-ui';
import { Editor } from '@dxos/react-ui-editor';
import { Text } from '@dxos/schema';

import { MarkdownEditor, MarkdownEditorProvider } from '#components';
import { Markdown } from '#types';

export type MarkdownEditableCardProps = { subject: Markdown.Document | Text.Text };

/**
 * Full-bleed editable variant of {@link MarkdownCard}. Activated by the host
 * passing `editable: true` on the card surface data (e.g. plugin-board cells).
 * Renders a plain editor (no app-graph toolbar / file upload / link queries)
 * so it stays self-contained inside the card; the regular MarkdownContainer
 * remains the canonical surface for full article views.
 */
export const MarkdownEditableCard = ({ subject }: MarkdownEditableCardProps) => {
  const id = Obj.getDXN(subject).toString();
  const [docContent] = useObject(Obj.instanceOf(Markdown.Document, subject) ? subject.content : undefined, 'content');
  const [textContent] = useObject(Obj.instanceOf(Text.Text, subject) ? subject : undefined, 'content');
  const initialValue = docContent ?? textContent;

  return (
    <Card.Section classNames='col-span-3 min-h-0'>
      <MarkdownEditorProvider id={id} object={subject} viewMode='source'>
        {(editorRootProps) => (
          <Editor.Root {...editorRootProps}>
            <MarkdownEditor.Content initialValue={initialValue} />
          </Editor.Root>
        )}
      </MarkdownEditorProvider>
    </Card.Section>
  );
};
