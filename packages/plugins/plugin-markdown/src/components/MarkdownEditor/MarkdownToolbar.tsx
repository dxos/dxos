//
// Copyright 2025 DXOS.org
//

import { type EditorView } from '@codemirror/view';
import React, { useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';

import { invariant } from '@dxos/invariant';
import { EditorToolbar, type EditorViewMode, addLink, useEditorToolbarState } from '@dxos/react-ui-editor';

import { type MarkdownEditorProps } from '../MarkdownEditor';

export type MarkdownToolbarProps = Pick<
  MarkdownEditorProps,
  'id' | 'role' | 'viewMode' | 'customActions' | 'onFileUpload' | 'onViewModeChange'
> & {
  editorView: EditorView;
};

// TODO(burdon): Remove deps on MarkdownToolbarProps.
export const MarkdownToolbar = ({
  id,
  role,
  editorView,
  viewMode,
  customActions,
  onFileUpload,
  onViewModeChange,
}: MarkdownToolbarProps) => {
  const toolbarState = useEditorToolbarState({ viewMode });

  // TODO(burdon): Pass in ref.
  const getView = useCallback(() => {
    invariant(editorView);
    return editorView;
  }, [editorView]);

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

  return (
    <>
      <input {...getInputProps()} />
      <EditorToolbar
        attendableId={id}
        role={role}
        state={toolbarState}
        customActions={customActions}
        getView={getView}
        viewMode={handleViewModeChange}
        image={handleImageUpload}
      />
    </>
  );
};
