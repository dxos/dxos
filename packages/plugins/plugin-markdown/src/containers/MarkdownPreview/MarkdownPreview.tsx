//
// Copyright 2026 DXOS.org
//

import { EditorView } from '@codemirror/view';
import React, { useMemo } from 'react';

import { Obj } from '@dxos/echo';
import { Editor } from '@dxos/react-ui-editor';
import * as Panel from '@dxos/react-ui/Panel';
import { Text } from '@dxos/schema';

import { MarkdownEditor, MarkdownEditorProvider } from '#components';
import { Markdown } from '#types';

export type MarkdownPreviewProps = { subject: Markdown.Document | Text.Text };

/**
 * A document read before its space is open, such as a share link's first look: its text, read-only and bound to no
 * live document, until the article replaces it.
 */
export const MarkdownPreview = ({ subject }: MarkdownPreviewProps) => {
  // Decoded JSON rather than a live object, so it is read once rather than subscribed to.
  const content = Obj.instanceOf(Markdown.Document, subject) ? subject.content?.target?.content : subject.content;
  // `readonly` only drops typing; the preview must not take edits that would be lost when the article replaces it.
  const extensions = useMemo(() => [EditorView.editable.of(false)], []);
  return (
    <MarkdownEditorProvider id={subject.id} viewMode='readonly' extensions={extensions}>
      {(editorRootProps) => (
        <Editor.Root {...editorRootProps}>
          <Panel.Root>
            <Panel.Body classNames='flex flex-col' data-testid='markdown.preview'>
              <MarkdownEditor.Content initialValue={content ?? ''} />
            </Panel.Body>
          </Panel.Root>
        </Editor.Root>
      )}
    </MarkdownEditorProvider>
  );
};

MarkdownPreview.displayName = 'MarkdownPreview';
