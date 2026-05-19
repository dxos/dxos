//
// Copyright 2026 DXOS.org
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
import { FileArticle } from '#containers';
import { FileAction, FileType } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'article',
        filter: AppSurface.oneOf(
          AppSurface.object(AppSurface.Article, FileType.FileType),
          AppSurface.object(AppSurface.Section, FileType.FileType),
          AppSurface.object(AppSurface.Slide, FileType.FileType),
        ),
        component: ({ data, role }) => <FileArticle role={role} subject={data.subject} />,
      }),
      Surface.create({
        id: 'create-form',
        role: 'form-input',
        filter: (data): data is { prop: string; schema: Schema.Schema.Any; fieldPropertyAst?: SchemaAST.AST } => {
          const annotation = findAnnotation<Record<string, string[]>>(
            (data.schema as Schema.Schema.All).ast,
            FileAction.UploadAnnotationId,
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
