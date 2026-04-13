//
// Copyright 2025 DXOS.org
//

import { type EditorView } from '@codemirror/view';
import React, { useCallback, useState } from 'react';

import { type FileInfo } from '@dxos/app-toolkit';
import { invariant } from '@dxos/invariant';
import { EditorToolbar, type EditorToolbarProps } from '@dxos/react-ui-editor';
import { composable, composableProps } from '@dxos/ui-theme';

import { FileUpload, type FileUploadAction } from './FileUpload';

export type MarkdownEditorToolbarProps = {
  id: string;
  editorView?: EditorView;
  onFileUpload?: (file: File) => Promise<FileInfo | undefined>;
} & Pick<EditorToolbarProps, 'role' | 'state' | 'customActions' | 'onAction' | 'onViewModeChange'>;

export const MarkdownEditorToolbar = composable<HTMLDivElement, MarkdownEditorToolbarProps>(
  (
    { id, role, state, editorView, customActions, onAction, onFileUpload, onViewModeChange, ...props },
    forwardedRef,
  ) => {
    const { className, ...rest } = composableProps(props);
    const [upload, setUpload] = useState<FileUploadAction | null>(null);
    const uploadRef = useCallback((next: FileUploadAction) => setUpload(() => next), []);

    const getView = useCallback(() => {
      invariant(editorView);
      return editorView;
    }, [editorView]);

    if (!editorView) {
      return <div className={className} {...rest} ref={forwardedRef} />;
    }

    return (
      <div role='none' className='contents' ref={forwardedRef}>
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
  },
);
