//
// Copyright 2025 DXOS.org
//

import { type EditorView } from '@codemirror/view';
import React, { useCallback, useState } from 'react';

import { type FileInfo } from '@dxos/app-toolkit';
import { Editor, type EditorToolbarProps } from '@dxos/react-ui-editor';
import { composable, composableProps } from '@dxos/ui-theme';

import { FileUpload, type FileUploadAction } from './FileUpload';

export type MarkdownEditorToolbarProps = {
  id: string;
  editorView?: EditorView;
  onFileUpload?: (file: File) => Promise<FileInfo | undefined>;
} & Pick<EditorToolbarProps, 'role' | 'customActions' | 'onAction' | 'onViewModeChange'>;

export const MarkdownEditorToolbar = composable<HTMLDivElement, MarkdownEditorToolbarProps>(
  ({ id, role, editorView, customActions, onAction, onFileUpload, onViewModeChange, ...props }, forwardedRef) => {
    const { className, ...rest } = composableProps(props);
    const [upload, setUpload] = useState<FileUploadAction | null>(null);
    const uploadRef = useCallback((next: FileUploadAction) => setUpload(() => next), []);

    if (!editorView) {
      return <div className={className} {...rest} ref={forwardedRef} />;
    }

    return (
      <div role='none' className='contents' ref={forwardedRef}>
        <Editor.Toolbar
          {...rest}
          classNames={className}
          attendableId={id}
          role={role}
          customActions={customActions}
          onAction={onAction}
          onImageUpload={upload ?? undefined}
          onViewModeChange={onViewModeChange}
        />

        {onFileUpload && <FileUpload ref={uploadRef} editorView={editorView} onFileUpload={onFileUpload} />}
      </div>
    );
  },
);
