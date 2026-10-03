//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

import { useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { meta } from '#meta';

export type FileInputProps = {
  onChange: (file: File) => void;
};

export const FileInput = ({ onChange }: FileInputProps) => {
  const { t } = useTranslation(meta.profile.key);

  const onDropAccepted = useCallback((files: File[]) => onChange?.(files[0]), [onChange]);

  // No client-side size or type filter: the active backend determines the size limit (inline is
  // capped, edge/wnfs are not) and `op:Create` enforces it; every type is accepted.
  const { acceptedFiles, getRootProps, getInputProps, isFocused, isDragAccept, isDragReject } = useDropzone({
    multiple: false,
    onDropAccepted,
  });

  return (
    <div
      {...getRootProps()}
      className={mx(
        'flex flex-col items-center p-8 border border-separator',
        isFocused && 'focus-ring',
        isDragAccept && 'bg-attention-surface',
        isDragReject && 'border-rose-bg',
      )}
    >
      <input {...getInputProps()} />
      {acceptedFiles[0] ? <p>{acceptedFiles[0].name}</p> : <p>{t('file-input.placeholder')}</p>}
    </div>
  );
};
