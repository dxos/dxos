//
// Copyright 2025 DXOS.org
//

import React, { type ReactElement, useCallback, useRef } from 'react';

import { useCapabilities } from '@dxos/app-framework/ui';
import { AppCapabilities, type FileInfo } from '@dxos/app-toolkit';
import { Obj } from '@dxos/echo';

export type UseFileUploadOptions = {
  /** ECHO subject whose containing database receives the upload. */
  subject: Obj.Unknown;
  /** Accept attribute for the underlying `<input type="file">`. */
  accept?: string;
  /** Allow selecting multiple files. */
  multiple?: boolean;
  /** Called once per uploaded file with the resulting `FileInfo`. */
  onUpload: (info: FileInfo & { url: string }, file: File) => void | Promise<void>;
};

export type UseFileUploadResult = {
  /** Programmatically open the OS file picker. No-op when `enabled` is false. */
  open: () => void;
  /**
   * `true` when a `FileUploader` capability is registered and the subject is
   * attached to a database. Use this to disable upload affordances (toolbar
   * buttons, drop targets) until the upload path is ready.
   */
  enabled: boolean;
  /**
   * Render this in your component tree to mount the hidden `<input type="file">`.
   * Position is irrelevant — it's `display: none`.
   */
  input: ReactElement;
};

/**
 * Reusable file-upload hook for plugin containers.
 *
 * Wraps the `AppCapabilities.FileUploader` capability and a hidden `<input type="file">`
 * so a container can offer "Add file" affordances without inlining the picker boilerplate.
 *
 * @example
 * const { open, enabled, input } = useFileUpload({
 *   subject: gallery,
 *   accept: 'image/*',
 *   onUpload: (info) => Obj.change(gallery, (obj) => { ... }),
 * });
 * // render: {input}
 * // wire: <Toolbar.IconButton disabled={!enabled} onClick={open} />
 */
export const useFileUpload = ({ subject, accept, multiple, onUpload }: UseFileUploadOptions): UseFileUploadResult => {
  const [uploader] = useCapabilities(AppCapabilities.FileUploader);
  const inputRef = useRef<HTMLInputElement>(null);

  const enabled = !!uploader && !!Obj.getDatabase(subject);

  const open = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const fileList = event.target.files;
      if (!fileList || fileList.length === 0) {
        return;
      }
      // Snapshot the FileList into a real array BEFORE resetting `value` —
      // clearing `value` empties the live FileList reference.
      const files = Array.from(fileList);
      event.target.value = '';

      const db = Obj.getDatabase(subject);
      if (!uploader || !db) {
        return;
      }
      for (const file of files) {
        const info = await uploader(db, file);
        if (info?.url) {
          await onUpload({ ...info, url: info.url } as FileInfo & { url: string }, file);
        }
      }
    },
    [uploader, subject, onUpload],
  );

  const input = (
    <input ref={inputRef} type='file' accept={accept} multiple={multiple} className='hidden' onChange={handleChange} />
  );

  return { open, enabled, input };
};
