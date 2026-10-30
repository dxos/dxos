//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as Spec from '@dxos/compute/Spec';

import { CodeArticle, CodeSettings, SpecArticle } from '#containers';
import { CodeProject } from '#types';

import { CodeNamespace } from '../namespace.ts';
import { isPluginSpecSubject } from '../plugin-spec.ts';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
      Surface.create({
        id: 'pluginSpec',
        filter: AppSurface.subject(AppSurface.Article, isPluginSpecSubject),
        component: SpecArticle,
        props: ({ role, data: { subject } }) => ({ role, content: subject.content, sourceKey: subject.sourceKey }),
      }),
      Surface.create({
        // A section, ahead of plugin-projects' plain editor: a spec's article is its feature map, and its text view
        // embeds the spec as a section.
        id: 'specArticle',
        filter: AppSurface.object(AppSurface.Section, Spec.Spec),
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
        filter: AppSurface.settings(AppSurface.Article, CodeNamespace.key),
        component: CodeSettings,
        props: ({ data: { subject } }) => ({ subject }),
      }),
    ]),
  ),
);
