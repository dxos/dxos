//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as SchemaEx from '@dxos/effect/SchemaEx';
import { File } from '@dxos/types';

import { FileArticle, FileCard, FileProperties, FileSettings } from '#containers';
import { meta } from '#meta';

import { FileAction } from '../types/FileCapabilities.ts';
import { FileUploadField } from './FileUploadField.tsx';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
      Surface.Root.create({
        id: 'article',
        filter: AppSurface.oneOf(
          AppSurface.object(AppSurface.Article, File.File),
          AppSurface.object(AppSurface.Section, File.File),
          AppSurface.object(AppSurface.Slide, File.File),
        ),
        component: FileArticle,
        props: ({ role, data: { subject, attendableId } }) => ({ role, subject, attendableId }),
      }),
      // The file's contents as a card body: what a chat embed or a link preview shows.
      Surface.Root.create({
        id: 'card',
        filter: AppSurface.object(AppSurface.CardContent, File.File),
        component: FileCard,
        props: ({ data: { subject } }) => ({ subject }),
      }),
      Surface.Root.create({
        id: 'objectProperties',
        // Renders inside `DefaultProperties`' `ObjectProperties` slot, so Name and Tags stay.
        filter: AppSurface.object(AppSurface.ObjectProperties, File.File),
        component: FileProperties,
        props: ({ data: { subject } }) => ({ subject }),
      }),
      Surface.Root.create({
        id: 'createForm',
        filter: AppSurface.formInputBySchema(
          (ast) => !!SchemaEx.findAnnotation<boolean>(ast, FileAction.UploadAnnotationId),
        ),
        component: FileUploadField,
      }),
      Surface.Root.create({
        id: 'pluginSettings',
        filter: AppSurface.settings(AppSurface.Article, meta.profile.key),
        component: FileSettings,
        props: ({ data: { subject } }) => ({ subject }),
      }),
    ]),
  ),
);
