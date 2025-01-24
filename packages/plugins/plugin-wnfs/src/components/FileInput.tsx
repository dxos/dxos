//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

import { findAnnotation, type S } from '@dxos/effect';
import { mx } from '@dxos/react-ui-theme';

import { WnfsAction } from '../types';
import { useTranslation } from '@dxos/react-ui';
import { WNFS_PLUGIN } from '../meta';

export type FileInputProps = {
  schema: S.Schema.Any;
  onChange: (file: File) => void;
};

export const FileInput = ({ schema, onChange }: FileInputProps) => {
  const { t } = useTranslation(WNFS_PLUGIN);
  const accept = findAnnotation<Record<string, string[]>>(schema.ast, WnfsAction.UploadAnnotationId);

  const onDropAccepted = useCallback((files: File[]) => onChange?.(files[0]), [onChange]);

  const { acceptedFiles, getRootProps, getInputProps, isFocused, isDragAccept, isDragReject } = useDropzone({
    multiple: false,
    accept,
    onDropAccepted,
  });

  return (
    <div
      {...getRootProps()}
      className={mx(
        'flex flex-col items-center p-8 border border-separator',
        isFocused && 'focus-ring',
        isDragAccept && 'bg-attention',
        isDragReject && 'border-error',
      )}
    >
      <input {...getInputProps()} />
      {acceptedFiles[0] ? (
        <p>{acceptedFiles[0].name}</p>
      ) : (
        <p>{t('file input placeholder')}</p>
      )}
    </div>
  );
};
