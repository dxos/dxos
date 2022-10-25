//
// Copyright 2022 DXOS.org
//

import React, { FC, useEffect, useRef } from 'react';

/**
 * Standard file upload dialog.
 */
export const FileUploadDialog: FC<{
  open?: boolean;
  onClose: () => void;
  onUpload: (files: File[]) => void;
  accept?: string;
  multiple?: false;
}> = ({ open = false, onClose, onUpload, accept, multiple = false }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const listener = () => {
      onClose();
    };

    if (open) {
      // The component is working perfectly in Kitchen-sink but, in the notebook-app,
      // the onChange event is not being triggered.
      // Some links to stackoverflow posts with discussion of users experiencing the same problem:
      // - https://stackoverflow.com/questions/50300392/react-input-type-file-onchange-not-firing
      // - https://stackoverflow.com/questions/65616592/react-input-onchange-not-firing-at-all
      // - https://stackoverflow.com/questions/66077400/react-hidden-input-type-file-onchange-not-firing
      // The most relevant fixes tried with no luck:
      // - Verify that the id of the input is not used on any other element
      // - Try using onInput instead of onChange
      // - Try with onInputCapture and onChangeCapture.
      // Adding the event listener on the 'change' event fixed the issue.
      inputRef?.current?.addEventListener('change', handleUpload);
      document.body.addEventListener('focus', listener, {
        capture: true,
        once: true
      });
      inputRef.current!.click();
    }

    return () => {
      inputRef?.current?.addEventListener('change', handleUpload);
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
      // https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/accept
      // https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/file#unique_file_type_specifiers
      accept={accept}
      multiple={multiple}
      style={{ display: 'none' }}
    />
  );
};
