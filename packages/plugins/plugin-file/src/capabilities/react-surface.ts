//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { SchemaEx } from '@dxos/effect';

import { FileArticle } from '#containers';
import { meta } from '#meta';
import { File, FileAction } from '#types';

import { FileSettingsSurface } from './FileSettingsSurface';
import { FileUploadField } from './FileUploadField';

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
        component: FileArticle,
        props: ({ role, data: { subject } }) => ({ role, subject }),
      }),
      Surface.create({
        id: 'createForm',
        filter: AppSurface.formInputBySchema(
          (ast) => !!SchemaEx.findAnnotation<Record<string, string[]>>(ast, FileAction.UploadAnnotationId),
        ),
        component: FileUploadField,
      }),
      Surface.create({
        id: 'pluginSettings',
        filter: AppSurface.settings(AppSurface.Article, meta.profile.key),
        component: FileSettingsSurface,
        props: ({ data: { subject } }) => ({ subject }),
      }),
    ]),
  ),
);
