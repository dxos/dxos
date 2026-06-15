//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import type * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';
import React, { useCallback } from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface, useSettingsState } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { SchemaEx } from '@dxos/effect';
import { type FormFieldComponentProps } from '@dxos/react-ui-form';

import { FileInput, FileSettings } from '#components';
import { FileArticle } from '#containers';
import { meta } from '#meta';
import { FileAction, File, type Settings } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'article',
        filter: AppSurface.oneOf(
          AppSurface.object(AppSurface.Article, File.File),
          AppSurface.object(AppSurface.Section, File.File),
          AppSurface.object(AppSurface.Slide, File.File),
        ),
        component: ({ data, role }) => <FileArticle role={role} subject={data.subject} />,
      }),
      Surface.create({
        id: 'createForm',
        role: 'form-input',
        filter: (data): data is { prop: string; schema: Schema.Schema.Any; fieldPropertyAst?: SchemaAST.AST } => {
          const annotation = SchemaEx.findAnnotation<Record<string, string[]>>(
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
      Surface.create({
        id: 'pluginSettings',
        filter: AppSurface.settings(AppSurface.Article, meta.id),
        component: ({ data: { subject } }) => {
          const { settings, updateSettings } = useSettingsState<Settings.Settings>(subject.atom);
          return <FileSettings settings={settings} onSettingsChange={updateSettings} />;
        },
      }),
    ]),
  ),
);
