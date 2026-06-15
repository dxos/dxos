//
// Copyright 2025 DXOS.org
//

import { type EditorView } from '@codemirror/view';
import React, { forwardRef, useEffect, useImperativeHandle } from 'react';
import { createPortal } from 'react-dom';
import { useDropzone } from 'react-dropzone';

import { type FileInfo } from '@dxos/app-toolkit';
import { addLink } from '@dxos/ui-editor';

export const IMAGE_FILES = ['.jpg', '.jpeg', '.png', '.gif'];

export type FileUploadAction = () => void;

export type FileUploadProps = {
  // Provided as a getter (not a value prop) so the live `EditorView` is never carried in a React prop
  // that React 19.2's dev render-logger would walk into a cross-origin frame. See
  // `react-ui-editor/.../controller.ts` for the full rationale.
  getView?: () => EditorView | null;
  onFileUpload?: (file: File) => Promise<FileInfo | undefined>;
};

// TODO(burdon): Factor out.
// TODO(burdon): Move to root? (support drag into document via dropzone).
export const FileUpload = forwardRef<FileUploadAction, FileUploadProps>(({ getView, onFileUpload }, forwardedRef) => {
  // https://react-dropzone.js.org
  const { acceptedFiles, open, inputRef } = useDropzone({
    disabled: !onFileUpload,
    multiple: false,
    noDrag: true,
    accept: {
      'image/*': IMAGE_FILES,
    },
  });

  useImperativeHandle(forwardedRef, () => open, []);

  useEffect(() => {
    if (acceptedFiles.length && onFileUpload) {
      requestAnimationFrame(async () => {
        const editorView = getView?.();
        if (!editorView) {
          return;
        }
        // NOTE: Clone file since react-dropzone patches in a non-standard `path` property, which confuses IPFS.
        const f = acceptedFiles[0];
        const file = new File([f], f.name, {
          type: f.type,
          lastModified: f.lastModified,
        });

        // TODO(burdon): Factor out.
        const info = await onFileUpload(file);
        if (info) {
          addLink({ url: info.url, image: true })(editorView);
        }
      });
    }
  }, [getView, acceptedFiles, onFileUpload]);

  if (!onFileUpload) {
    return null;
  }

  return <>{createPortal(<input ref={inputRef} />, document.body)} </>;
});
