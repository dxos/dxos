//
// Copyright 2025 DXOS.org
//

import type * as Schema from 'effect/Schema';
import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

import { findAnnotation } from '@dxos/effect';
import { useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { meta } from '../meta';
import { WnfsAction } from '../types';

export type FileInputProps = {
  schema: Schema.Schema.Any;
  onChange: (file: File) => void;
};

export const FileInput = ({ schema, onChange }: FileInputProps) => {
  const { t } = useTranslation(meta.id);
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
        isDragReject && 'border-roseFill',
      )}
    >
      <input {...getInputProps()} />
      {acceptedFiles[0] ? <p>{acceptedFiles[0].name}</p> : <p>{t('file input placeholder')}</p>}
    </div>
  );
};
