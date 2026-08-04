//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { CodeArticle, SpecArticle } from '#containers';
import { meta } from '#meta';
import { CodeProject, Spec } from '#types';

import { isPluginSpecSubject } from '../plugin-spec';
import { CodeSettingsSurface } from './CodeSettingsSurface';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
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
        component: CodeSettingsSurface,
        props: ({ data: { subject } }) => ({ subject }),
      }),
    ]),
  ),
);
