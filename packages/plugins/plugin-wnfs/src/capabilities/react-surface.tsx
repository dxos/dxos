//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import type * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';
import React, { useCallback } from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { findAnnotation } from '@dxos/effect';
import { type FormFieldComponentProps } from '@dxos/react-ui-form';

import { FileInput } from '#components';
import { FileContainer } from '#containers';
import { WnfsAction, WnfsFile } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'article',
        // TODO(wittjosiah): Split into multiple surfaces if this filter proves too strict for non-article roles.
        filter: AppSurface.oneOf(
          AppSurface.object(AppSurface.Article, WnfsFile.File),
          AppSurface.object(AppSurface.Section, WnfsFile.File),
          AppSurface.object(AppSurface.Slide, WnfsFile.File),
        ),
        component: ({ data, role }) => <FileContainer role={role} subject={data.subject} />,
      }),
      Surface.create({
        id: 'create-form',
        role: 'form-input',
        filter: (data): data is { prop: string; schema: Schema.Schema.Any; fieldPropertyAst?: SchemaAST.AST } => {
          const annotation = findAnnotation<boolean>(
            (data.schema as Schema.Schema.All).ast,
            WnfsAction.UploadAnnotationId,
          );
          return !!annotation;
        },
        component: ({ data: { schema, fieldPropertyAst }, ...props }) => {
          const ast = fieldPropertyAst;
          if (!ast) {
            return null;
          }

          const inputProps = { ...props, type: ast } as unknown as FormFieldComponentProps;
          const handleChange = useCallback(
            (file: File) => inputProps.onValueChange?.(ast, file),
            [ast, inputProps.onValueChange],
          );

          return <FileInput schema={schema} onChange={handleChange} />;
        },
      }),
    ]),
  ),
);
