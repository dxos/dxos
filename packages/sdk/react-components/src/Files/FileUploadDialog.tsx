//
// Copyright 2022 DXOS.org
//

import React, { ChangeEvent, useEffect, useRef } from 'react';

export interface FileUploadDialogProps {
  open?: boolean
  onClose: () => void
  onUpload: (files: File[]) => void
}

/**
 * FileUploadDialog
 */
export const FileUploadDialog = ({
  open = false,
  onClose,
  onUpload
}: FileUploadDialogProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const listener = () => {
      onClose();
    };

    if (open) {
      document.body.addEventListener('focus', listener, { capture: true, once: true });
      inputRef.current!.click();
    }

    return () => {
      document.body.removeEventListener('focus', listener);
    }
  }, [open]);

  // TODO(burdon): Drag files.
  //  https://developer.mozilla.org/en-US/docs/Web/API/File/Using_files_from_web_applications#selecting_files_using_drag_and_drop

  // https://developer.mozilla.org/en-US/docs/Web/API/File/Using_files_from_web_applications
  // https://developer.mozilla.org/en-US/docs/Web/API/FileList
  const handleUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const { files: fileList } = event.target;
    if (!fileList) {
      return;
    }

    const files: File[] = [];
    for (let i = 0; i < fileList.length; i++) {
      files.push(fileList.item(i)!);
    }

    onUpload(files);
  };

  return (
    <input
      id='input'
      ref={inputRef}
      type='file'
      multiple
      onChange={handleUpload}
      style={{ display: 'none' }}
    />
  );
};
