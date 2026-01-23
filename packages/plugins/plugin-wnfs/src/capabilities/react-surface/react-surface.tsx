//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import type * as Schema from 'effect/Schema';
import React, { useCallback } from 'react';

import { Capability, Common } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { findAnnotation } from '@dxos/effect';
import { type FormFieldComponentProps } from '@dxos/react-ui-form';

import { FileContainer, FileInput } from '../../components';
import { meta } from '../../meta';
import { WnfsAction, WnfsFile } from '../../types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Common.Capability.ReactSurface, [
      Common.createSurface({
        id: `${meta.id}/article`,
        role: ['article', 'section', 'slide'],
        filter: (data): data is { subject: WnfsFile.File } => Obj.instanceOf(WnfsFile.File, data.subject),
        component: ({ data, role }) => <FileContainer role={role} file={data.subject} />,
      }),
      Common.createSurface({
        id: `${meta.id}/create-form`,
        role: 'form-input',
        filter: (data): data is { prop: string; schema: Schema.Schema.Any } => {
          const annotation = findAnnotation<boolean>(
            (data.schema as Schema.Schema.All).ast,
            WnfsAction.UploadAnnotationId,
          );
          return !!annotation;
        },
        component: ({ data: { schema }, ...props }) => {
          const inputProps = props as unknown as FormFieldComponentProps;
          const handleChange = useCallback(
            (file: File) => inputProps.onValueChange?.(inputProps.type, file),
            [inputProps.type, inputProps.onValueChange],
          );

          return <FileInput schema={schema} onChange={handleChange} />;
        },
      }),
    ]),
  ),
);
