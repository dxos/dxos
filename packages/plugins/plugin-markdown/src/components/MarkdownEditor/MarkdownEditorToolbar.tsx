//
// Copyright 2025 DXOS.org
//

import { type EditorView } from '@codemirror/view';
import React, { useCallback, useState } from 'react';

import { type FileInfo } from '@dxos/app-toolkit';
import { composable, composableProps } from '@dxos/react-ui';
import { Editor, type EditorToolbarProps } from '@dxos/react-ui-editor';

import { FileUpload, type FileUploadAction } from './FileUpload';

export type MarkdownEditorToolbarProps = {
  id: string;
  // Provided as a getter (not a value prop) so the live `EditorView` is never carried in a React prop
  // that React 19.2's dev render-logger would walk into a cross-origin frame. See
  // `react-ui-editor/.../controller.ts` for the full rationale.
  getView?: () => EditorView | null;
  onFileUpload?: (file: File) => Promise<FileInfo | undefined>;
} & Pick<EditorToolbarProps, 'role' | 'customActions' | 'onAction' | 'onViewModeChange' | 'disabled'>;

export const MarkdownEditorToolbar = composable<HTMLDivElement, MarkdownEditorToolbarProps>(
  (
    { id, role, getView, customActions, onAction, onFileUpload, onViewModeChange, disabled, ...props },
    forwardedRef,
  ) => {
    const { className, ...rest } = composableProps(props);
    const [upload, setUpload] = useState<FileUploadAction | null>(null);
    const uploadRef = useCallback((next: FileUploadAction) => setUpload(() => next), []);

    if (!getView?.()) {
      return <div className={className} {...rest} ref={forwardedRef} />;
    }

    return (
      <div className='contents' ref={forwardedRef}>
        <Editor.Toolbar
          {...rest}
          classNames={className}
          attendableId={id}
          role={role}
          disabled={disabled}
          customActions={customActions}
          onAction={onAction}
          onImageUpload={upload ?? undefined}
          onViewModeChange={onViewModeChange}
        />

        {onFileUpload && <FileUpload ref={uploadRef} getView={getView} onFileUpload={onFileUpload} />}
      </div>
    );
  },
);
