//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useCallback } from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface, useSettingsState } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { SchemaEx } from '@dxos/effect';
import { type FormFieldRendererProps } from '@dxos/react-ui-form';

import { FileInput } from '#components';
import { FileArticle, FileSettings } from '#containers';
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
        filter: AppSurface.formInputBySchema(
          (ast) => !!SchemaEx.findAnnotation<Record<string, string[]>>(ast, FileAction.UploadAnnotationId),
        ),
        component: ({ data, ...props }) => {
          const ast = data.fieldPropertyAst;
          if (!ast) {
            return null;
          }

          const inputProps = { ...props, type: ast } as unknown as FormFieldRendererProps;
          const handleChange = useCallback(
            (file: File) => inputProps.onValueChange?.(ast, file),
            [ast, inputProps.onValueChange],
          );

          return <FileInput schema={data.schema} onChange={handleChange} />;
        },
      }),
      Surface.create({
        id: 'pluginSettings',
        filter: AppSurface.settings(AppSurface.Article, meta.profile.key),
        component: ({ data: { subject } }) => {
          const { settings, updateSettings } = useSettingsState<Settings.Settings>(subject.atom);
          return <FileSettings settings={settings} onSettingsChange={updateSettings} />;
        },
      }),
    ]),
  ),
);
