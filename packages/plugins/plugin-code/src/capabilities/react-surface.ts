//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { CodeArticle, CodeSettings, SpecArticle } from '#containers';
import { meta } from '#meta';
import { CodeProject, Spec } from '#types';

import { isPluginSpecSubject } from '../plugin-spec.ts';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
      Surface.create({
        id: 'pluginSpec',
        filter: AppSurface.subject(AppSurface.Article, isPluginSpecSubject),
        component: SpecArticle,
        props: ({ role, data: { subject } }) => ({ role, content: subject.content }),
      }),
      Surface.create({
        id: 'specArticle',
        filter: AppSurface.oneOf(
          AppSurface.object(AppSurface.Article, Spec.Spec),
          AppSurface.object(AppSurface.Section, Spec.Spec),
        ),
        component: SpecArticle,
        props: ({ role, data: { subject, attendableId } }) => ({ role, subject, attendableId }),
      }),
      Surface.create({
        id: 'codeArticle',
        filter: AppSurface.oneOf(
          AppSurface.object(AppSurface.Article, CodeProject.CodeProject),
          AppSurface.object(AppSurface.Section, CodeProject.CodeProject),
        ),
        component: CodeArticle,
        props: ({ role, data: { subject, attendableId } }) => ({ role, subject, attendableId }),
      }),
      Surface.create({
        id: 'codeSettings',
        filter: AppSurface.settings(AppSurface.Article, meta.profile.key),
        component: CodeSettings,
        props: ({ data: { subject } }) => ({ subject }),
      }),
    ]),
  ),
);
