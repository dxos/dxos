//
// Copyright 2022 DXOS.org
//

import React, { FC, useEffect, useRef } from 'react';

/**
 * Standard file upload dialog.
 */
export const FileUploadDialog: FC<{
  accept?: string
  open?: boolean
  onClose: () => void
  onUpload: (files: File[]) => void
  multiple?: false
}> = ({
  accept,
  open = false,
  onClose,
  onUpload,
  multiple = false
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const listener = () => {
      onClose();
    };

    if (open) {
      inputRef?.current?.addEventListener('change', handleUpload);
      document.body.addEventListener('focus', listener, { capture: true, once: true });
      inputRef.current!.click();
    }

    return () => {
      inputRef?.current?.removeEventListener('change', handleUpload);
      document.body.removeEventListener('focus', listener);
    };
  }, [open]);

  // TODO(burdon): Drag files.
  //  https://developer.mozilla.org/en-US/docs/Web/API/File/Using_files_from_web_applications#selecting_files_using_drag_and_drop

  // https://developer.mozilla.org/en-US/docs/Web/API/File/Using_files_from_web_applications
  // https://developer.mozilla.org/en-US/docs/Web/API/FileList
  const handleUpload: (this: HTMLInputElement, event: Event) => any = (event) => {
    const { files: fileList } = event.target as HTMLInputElement;
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
      accept={accept}
      style={{ display: 'none' }}
      multiple={multiple}
    />
  );
};
