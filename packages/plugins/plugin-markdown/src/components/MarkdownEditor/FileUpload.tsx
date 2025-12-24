//
// Copyright 2025 DXOS.org
//

import { type EditorView } from '@codemirror/view';
import React, { forwardRef, useEffect, useImperativeHandle } from 'react';
import { createPortal } from 'react-dom';
import { useDropzone } from 'react-dropzone';

import { type FileInfo } from '@dxos/app-framework';
import { addLink } from '@dxos/ui-editor';

export const IMAGE_FILES = ['.jpg', '.jpeg', '.png', '.gif'];

export type FileUploadAction = () => void;

export type FileUploadProps = {
  editorView?: EditorView;
  onFileUpload?: (file: File) => Promise<FileInfo | undefined>;
};

// TODO(burdon): Factor out.
// TODO(burdon): Move to root? (support drag into document via dropzone).
export const FileUpload = forwardRef<FileUploadAction, FileUploadProps>(
  ({ editorView, onFileUpload }, forwardedRef) => {
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
      if (editorView && acceptedFiles.length && onFileUpload) {
        requestAnimationFrame(async () => {
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
    }, [editorView, acceptedFiles, onFileUpload]);

    if (!onFileUpload) {
      return null;
    }

    return <>{createPortal(<input ref={inputRef} />, document.body)} </>;
  },
);
