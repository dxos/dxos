//
// Copyright 2025 DXOS.org
//

import { type EditorView } from '@codemirror/view';
import React, { useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';

import { type FileInfo } from '@dxos/app-framework';
import { invariant } from '@dxos/invariant';
import { type ThemedClassName } from '@dxos/react-ui';
import { EditorToolbar, type EditorToolbarProps, type EditorViewMode, addLink } from '@dxos/react-ui-editor';

export type MarkdownEditorToolbarProps = ThemedClassName<
  {
    id: string;
    editorView?: EditorView;
    // TOOD(burdon): Factor out file management.
    onFileUpload?: (file: File) => Promise<FileInfo | undefined>;
  } & Pick<EditorToolbarProps, 'role' | 'state' | 'customActions' | 'onViewModeChange'>
>;

// TODO(burdon): Overactive measure loop during navigation.
//  Measure loop restarted more than 5 times
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
  const { open, getInputProps } = useImageUpload({ editorView, onFileUpload });

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
        getView={getView}
        customActions={customActions}
        onImageUpload={open}
        onViewModeChange={handleViewModeChange}
      />

      {/* TODO(burdon): Portal? */}
      <input {...getInputProps()} />
    </>
  );
};

// TODO(burdon): Move to root? (support drag into document via dropzone).
const useImageUpload = ({
  editorView,
  onFileUpload,
}: Pick<MarkdownEditorToolbarProps, 'editorView' | 'onFileUpload'>) => {
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

  return {
    getInputProps,
    open,
  };
};
