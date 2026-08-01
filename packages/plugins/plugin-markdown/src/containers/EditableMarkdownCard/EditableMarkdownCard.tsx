//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { Card } from '@dxos/react-ui';
import { Editor } from '@dxos/react-ui-editor';
import { Text } from '@dxos/schema';

import { MarkdownEditor, MarkdownEditorProvider } from '#components';
import { Markdown } from '#types';

export type EditableMarkdownCardProps = { subject: Markdown.Document | Text.Text };

/**
 * Full-bleed editable variant of {@link MarkdownCard}. Activated by the host
 * passing `editable: true` on the card surface data (e.g. plugin-board cells).
 * Renders a plain editor (no app-graph toolbar / file upload / link queries)
 * so it stays self-contained inside the card; the regular MarkdownArticle
 * remains the canonical surface for full article views.
 */
export const EditableMarkdownCard = ({ subject }: EditableMarkdownCardProps) => {
  const id = Obj.getURI(subject);
  const [docContent] = useObject(Obj.instanceOf(Markdown.Document, subject) ? subject.content : undefined, 'content');
  const [textContent] = useObject(Obj.instanceOf(Text.Text, subject) ? subject : undefined, 'content');
  const initialValue = docContent ?? textContent;
  const identity = useIdentity();

  return (
    <Card.Section classNames='overflow-hidden'>
      <Card.Row fullWidth>
        <MarkdownEditorProvider id={id} object={subject} viewMode='source' identity={identity}>
          {(editorRootProps) => (
            <Editor.Root {...editorRootProps}>
              <MarkdownEditor.Content compact initialValue={initialValue} />
            </Editor.Root>
          )}
        </MarkdownEditorProvider>
      </Card.Row>
    </Card.Section>
  );
};

EditableMarkdownCard.displayName = 'EditableMarkdownCard';
