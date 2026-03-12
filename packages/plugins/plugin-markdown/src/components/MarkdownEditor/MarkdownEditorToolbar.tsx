//
// Copyright 2025 DXOS.org
//

import { type EditorView } from '@codemirror/view';
import React, { type ComponentPropsWithoutRef, useCallback, useState } from 'react';

import { type FileInfo } from '@dxos/app-toolkit';
import { invariant } from '@dxos/invariant';
import { type ThemedClassName } from '@dxos/react-ui';
import { EditorToolbar, type EditorToolbarProps } from '@dxos/react-ui-editor';
import { type EditorViewMode } from '@dxos/ui-editor';

import { FileUpload, type FileUploadAction } from './FileUpload';
import { composableProps } from '@dxos/ui-theme';

export type MarkdownEditorToolbarProps = ThemedClassName<
  ComponentPropsWithoutRef<'div'> & {
    id: string;
    editorView?: EditorView;
    onFileUpload?: (file: File) => Promise<FileInfo | undefined>;
  } & Pick<EditorToolbarProps, 'role' | 'state' | 'customActions' | 'onAction' | 'onViewModeChange'>
>;

export const MarkdownEditorToolbar = ({
  id,
  role,
  state,
  editorView,
  customActions,
  onAction,
  onFileUpload,
  onViewModeChange,
  ...props
}: MarkdownEditorToolbarProps) => {
  const { className, ...rest } = composableProps(props);
  const [upload, setUpload] = useState<FileUploadAction | null>(null);
  const uploadRef = useCallback((next: FileUploadAction) => setUpload(() => next), []);

  const getView = useCallback(() => {
    invariant(editorView);
    return editorView;
  }, [editorView]);

  if (!editorView) {
    return <div {...props} />;
  }

  return (
    <div role='none' className='contents'>
      <EditorToolbar
        {...rest}
        classNames={className}
        attendableId={id}
        role={role}
        state={state}
        customActions={customActions}
        getView={getView}
        onAction={onAction}
        onImageUpload={upload ?? undefined}
        onViewModeChange={onViewModeChange}
      />

      {onFileUpload && <FileUpload ref={uploadRef} editorView={editorView} onFileUpload={onFileUpload} />}
    </div>
  );
};
