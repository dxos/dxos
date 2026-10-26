//
// Copyright 2026 DXOS.org
//

import { EditorView } from '@codemirror/view';
import React, { useMemo } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import { Obj } from '@dxos/echo';
import { Editor } from '@dxos/react-ui-editor';
import * as ReactHooks from '@dxos/react-ui/Hooks';
import * as Panel from '@dxos/react-ui/Panel';
import { Text } from '@dxos/schema';
import { folding } from '@dxos/ui-editor';
import { isTruthy } from '@dxos/util';

import { MarkdownEditor, MarkdownEditorProvider } from '#components';
import { Markdown, MarkdownCapabilities } from '#types';

export type MarkdownPreviewProps = { subject: Markdown.Document | Text.Text };

/**
 * A document read before its space is open, such as a share link's first look: its text, read-only and bound to no
 * live document, until the article replaces it.
 */
export const MarkdownPreview = ({ subject }: MarkdownPreviewProps) => {
  // Decoded JSON rather than a live object, so it is read once rather than subscribed to.
  const content = Obj.instanceOf(Markdown.Document, subject) ? subject.content?.target?.content : subject.content;
  // Laid out as the article lays out, so the text does not move when the article replaces the preview.
  const settings = Hooks.useOptionalAtomCapability(MarkdownCapabilities.Settings);
  const platform = ReactHooks.usePlatform();
  const withFolding = !!settings?.folding && platform !== 'mobile';
  // `readonly` only drops typing; the preview must not take edits that would be lost when the article replaces it.
  const extensions = useMemo(
    () => [EditorView.editable.of(false), withFolding && folding()].filter(isTruthy),
    [withFolding],
  );
  return (
    <MarkdownEditorProvider id={subject.id} viewMode='readonly' extensions={extensions}>
      {(editorRootProps) => (
        <Editor.Root {...editorRootProps}>
          <Panel.Root>
            {settings?.toolbar && (
              // Inert: it holds the article's toolbar row, and an action here would edit text the article discards.
              <Panel.Header>
                <div inert className='contents'>
                  <MarkdownEditor.Toolbar classNames='dx-document' />
                </div>
              </Panel.Header>
            )}
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
