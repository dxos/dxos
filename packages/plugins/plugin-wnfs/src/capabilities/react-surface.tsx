//
// Copyright 2025 DXOS.org
//

import { type Schema } from 'effect';
import React, { useCallback } from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { findAnnotation } from '@dxos/effect';
import { type InputProps } from '@dxos/react-ui-form';

import { FileContainer, FileInput } from '../components';
import { WNFS_PLUGIN } from '../meta';
import { FileType, WnfsAction } from '../types';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${WNFS_PLUGIN}/article`,
      role: ['article', 'section', 'slide'],
      filter: (data): data is { subject: FileType } => Obj.instanceOf(FileType, data.subject),
      component: ({ data, role }) => <FileContainer role={role} file={data.subject} />,
    }),
    createSurface({
      id: `${WNFS_PLUGIN}/create-form`,
      role: 'form-input',
      filter: (data): data is { prop: string; schema: Schema.Schema.Any } => {
        const annotation = findAnnotation<boolean>(
          (data.schema as Schema.Schema.All).ast,
          WnfsAction.UploadAnnotationId,
        );
        return !!annotation;
      },
      component: ({ data: { prop, schema }, ...props }) => {
        const inputProps = props as unknown as InputProps;
        const handleChange = useCallback(
          (file: File) => inputProps.onValueChange?.('object', file),
          [prop, inputProps.onValueChange],
        );

        return <FileInput schema={schema} onChange={handleChange} />;
      },
    }),
  ]);
