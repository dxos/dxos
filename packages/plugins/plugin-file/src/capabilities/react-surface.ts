//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { SchemaEx } from '@dxos/effect';
import { File } from '@dxos/types';

import { FileArticle, FileProperties, FileSettings } from '#containers';
import { meta } from '#meta';

import { FileAction } from '../types/FileCapabilities';
import { FileUploadField } from './FileUploadField';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
      Surface.create({
        id: 'article',
        filter: AppSurface.oneOf(
          AppSurface.object(AppSurface.Article, File.File),
          AppSurface.object(AppSurface.Section, File.File),
          AppSurface.object(AppSurface.Slide, File.File),
        ),
        component: FileArticle,
        props: ({ role, data: { subject, attendableId } }) => ({ role, subject, attendableId }),
      }),
      Surface.create({
        id: 'objectProperties',
        // Renders inside `DefaultProperties`' `ObjectProperties` slot, so Name and Tags stay.
        filter: AppSurface.object(AppSurface.ObjectProperties, File.File),
        component: FileProperties,
        props: ({ data: { subject } }) => ({ subject }),
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
        component: FileSettings,
        props: ({ data: { subject } }) => ({ subject }),
      }),
    ]),
  ),
);
