//
// Copyright 2025 DXOS.org
//

import { type EditorView } from '@codemirror/view';
import React, { useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';

import { type FileInfo } from '@dxos/app-framework';
import { invariant } from '@dxos/invariant';
import {
  EditorToolbar,
  type EditorToolbarProps,
  type EditorViewMode,
  addLink,
  useEditorToolbarState,
} from '@dxos/react-ui-editor';

export type MarkdownEditorToolbarProps = {
  id: string;
  editorView?: EditorView;
  // TODO(wittjosiah): Generalize custom toolbar actions (e.g. comment, upload, etc.)
  viewMode?: EditorViewMode;
  // TOOD(burdon): Factor out file management.
  onFileUpload?: (file: File) => Promise<FileInfo | undefined>;
  onViewModeChange?: (id: string, mode: EditorViewMode) => void;
} & Pick<EditorToolbarProps, 'role' | 'customActions'>;

export const MarkdownEditorToolbar = ({
  id,
  role,
  editorView,
  viewMode,
  customActions,
  onFileUpload,
  onViewModeChange,
}: MarkdownEditorToolbarProps) => {
  const toolbarState = useEditorToolbarState({ viewMode });

  const getView = useCallback(() => {
    invariant(editorView);
    return editorView;
  }, [editorView]);

  // TODO(burdon): Move to root (support drag into document).
  // https://react-dropzone.js.org/#src
  const { acceptedFiles, getInputProps, open } = useDropzone({
    multiple: false,
    noDrag: true,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.gif'],
    },
  });

  useEffect(() => {
    if (editorView && acceptedFiles.length && onFileUpload) {
      requestAnimationFrame(async () => {
        // NOTE: Clone file since react-dropzone patches in a non-standard `path` property, which confuses IPFS.
        const f = acceptedFiles[0];
        const file = new File([f], f.name, {
          type: f.type,
          lastModified: f.lastModified,
        });

        const info = await onFileUpload(file);
        if (info) {
          addLink({ url: info.url, image: true })(editorView);
        }
      });
    }
  }, [editorView, acceptedFiles, onFileUpload]);

  const handleImageUpload = useCallback(() => {
    if (onFileUpload) {
      open();
    }
  }, [onFileUpload]);

  const handleViewModeChange = useCallback(
    (mode: EditorViewMode) => onViewModeChange?.(id, mode),
    [id, onViewModeChange],
  );

  if (!editorView) {
    return <div />;
  }

  return (
    <>
      <input {...getInputProps()} />
      <EditorToolbar
        attendableId={id}
        role={role}
        state={toolbarState}
        getView={getView}
        customActions={customActions}
        image={handleImageUpload}
        onViewModeChange={handleViewModeChange}
      />
    </>
  );
};
