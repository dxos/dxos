//
// Copyright 2026 DXOS.org
//

import type * as Schema from 'effect/Schema';
import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

import { SchemaEx } from '@dxos/effect';
import { useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { meta } from '#meta';
import { FileAction, MAX_FILE_SIZE } from '#types';

export type FileInputProps = {
  schema: Schema.Schema.Any;
  onChange: (file: File) => void;
};

export const FileInput = ({ schema, onChange }: FileInputProps) => {
  const { t } = useTranslation(meta.profile.key);
  const accept = SchemaEx.findAnnotation<Record<string, string[]>>(schema.ast, FileAction.UploadAnnotationId);

  const onDropAccepted = useCallback((files: File[]) => onChange?.(files[0]), [onChange]);

  const { acceptedFiles, getRootProps, getInputProps, isFocused, isDragAccept, isDragReject } = useDropzone({
    multiple: false,
    accept,
    maxSize: MAX_FILE_SIZE,
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
