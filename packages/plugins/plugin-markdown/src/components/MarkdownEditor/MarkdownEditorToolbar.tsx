//
// Copyright 2025 DXOS.org
//

import { type EditorView } from '@codemirror/view';
import React, { useCallback, useState } from 'react';

import { type FileInfo } from '@dxos/app-framework';
import { invariant } from '@dxos/invariant';
import { type ThemedClassName } from '@dxos/react-ui';
import { EditorToolbar, type EditorToolbarProps, type EditorViewMode } from '@dxos/react-ui-editor';

import { FileUpload, type FileUploadAction } from './FileUpload';

export type MarkdownEditorToolbarProps = ThemedClassName<
  {
    id: string;
    editorView?: EditorView;
    onFileUpload?: (file: File) => Promise<FileInfo | undefined>;
  } & Pick<EditorToolbarProps, 'role' | 'state' | 'customActions' | 'onViewModeChange'>
>;

export const MarkdownEditorToolbar = ({
  classNames,
  id,
  role,
  state,
  editorView,
  customActions,
  onFileUpload,
  onViewModeChange,
}: MarkdownEditorToolbarProps) => {
  const [upload, setUpload] = useState<FileUploadAction | null>(null);
  const uploadRef = useCallback((next: FileUploadAction) => setUpload(() => next), []);

  const handleViewModeChange = useCallback((mode: EditorViewMode) => onViewModeChange?.(mode), [onViewModeChange]);

  const getView = useCallback(() => {
    invariant(editorView);
    return editorView;
  }, [editorView]);

  if (!editorView) {
    return <div />;
  }

  return (
    <>
      <EditorToolbar
        classNames={classNames}
        attendableId={id}
        role={role}
        state={state}
        customActions={customActions}
        getView={getView}
        onImageUpload={upload ?? undefined}
        onViewModeChange={handleViewModeChange}
      />

      {onFileUpload && <FileUpload ref={uploadRef} editorView={editorView} onFileUpload={onFileUpload} />}
    </>
  );
};
