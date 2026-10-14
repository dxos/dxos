//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import type * as Surface from '@dxos/app-framework/Surface';
import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import { type FormFieldRendererProps } from '@dxos/react-ui-form';

import { FileInput } from '#components';

/** The form renderer's own props ride alongside `data` on the surface envelope. */
export type FileUploadFieldProps = Surface.ComponentProps<AppSurface.FormInputData> &
  Pick<FormFieldRendererProps<File>, 'onValueChange'>;

/**
 * Form field that uploads a file for an upload-annotated property. It consumes the whole surface
 * envelope, so it is registered without a `props` mapper.
 */
export const FileUploadField = ({ data, onValueChange }: FileUploadFieldProps) => {
  const ast = data.fieldPropertyAst;
  const handleChange = useCallback(
    (file: File) => {
      if (ast) {
        onValueChange?.(ast, file);
      }
    },
    [ast, onValueChange],
  );

  if (!ast) {
    return null;
  }

  return <FileInput onChange={handleChange} />;
};
