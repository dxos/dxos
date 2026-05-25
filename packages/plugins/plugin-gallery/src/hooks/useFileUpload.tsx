//
// Copyright 2025 DXOS.org
//

import React, { type ReactElement, useCallback, useRef } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { FileOperation } from '@dxos/plugin-file/types';
import { SpaceOperation } from '@dxos/plugin-space';
import { File } from '@dxos/types';

export type UseFileUploadOptions = {
  /** ECHO subject whose containing database receives the upload. */
  subject: Obj.Unknown;
  /** Accept attribute for the underlying `<input type="file">`. */
  accept?: string;
  /** Allow selecting multiple files. */
  multiple?: boolean;
  /** Called once per uploaded file with the resulting `File.File` ECHO object. */
  onUpload: (uploaded: File.File, source: globalThis.File) => void | Promise<void>;
};

export type UseFileUploadResult = {
  /** Programmatically open the OS file picker. No-op when `enabled` is false. */
  open: () => void;
  /**
   * `true` when the operation invoker is available and the subject is attached
   * to a database. Use this to disable upload affordances (toolbar buttons,
   * drop targets) until the upload path is ready.
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
 * Invokes `FileOperation.Create` (which dispatches to whichever
 * `FileCapabilities.Backend` is active) and adds the resulting `File.File`
 * object to the subject's space. The `onUpload` callback receives the new
 * ECHO object so the caller can build a `Ref` to it.
 */
export const useFileUpload = ({ subject, accept, multiple, onUpload }: UseFileUploadOptions): UseFileUploadResult => {
  const { invokePromise } = useOperationInvoker();
  const inputRef = useRef<HTMLInputElement>(null);

  const enabled = !!invokePromise && !!Obj.getDatabase(subject);

  const open = useCallback(() => {
    if (!enabled) {
      return;
    }
    inputRef.current?.click();
  }, [enabled]);

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
      if (!invokePromise || !db) {
        return;
      }

      for (const source of files) {
        try {
          const created = await invokePromise(FileOperation.Create, { file: source, db });
          const fileObj = created.data?.object;
          if (!fileObj) {
            continue;
          }
          const added = await invokePromise(SpaceOperation.AddObject, { target: db, object: fileObj, hidden: true });
          await onUpload((added.data?.object ?? fileObj) as File.File, source);
        } catch (err) {
          // TODO(burdon): Surface to caller via an `onError` option once a UX for upload errors is decided.
          log.warn('file upload failed', { file: source.name, err });
        }
      }
    },
    [invokePromise, subject, onUpload],
  );

  const input = (
    <input ref={inputRef} type='file' accept={accept} multiple={multiple} className='hidden' onChange={handleChange} />
  );

  return { open, enabled, input };
};
