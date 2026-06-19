//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface, useSettingsState } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { CodeArticle, CodeSettings, SpecArticle } from '#containers';
import { meta } from '#meta';
import { CodeProject, Settings, Spec } from '#types';

import { SpecView } from '../containers/SpecArticle/SpecArticle';
import { isPluginSpecSubject } from '../plugin-spec';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'specArticle',
        filter: AppSurface.oneOf(
          AppSurface.object(AppSurface.Article, Spec.Spec),
          AppSurface.object(AppSurface.Section, Spec.Spec),
        ),
        component: ({ data: { subject, attendableId }, role }) => (
          <SpecArticle role={role} subject={subject} attendableId={attendableId} />
        ),
      }),
      Surface.create({
        id: 'codeArticle',
        filter: AppSurface.oneOf(
          AppSurface.object(AppSurface.Article, CodeProject.CodeProject),
          AppSurface.object(AppSurface.Section, CodeProject.CodeProject),
        ),
        component: ({ data: { subject, attendableId }, role }) => (
          <CodeArticle role={role} subject={subject} attendableId={attendableId} />
        ),
      }),
      Surface.create({
        id: 'codeSettings',
        filter: AppSurface.settings(AppSurface.Article, meta.profile.key),
        component: ({ data: { subject } }) => {
          const { settings, updateSettings } = useSettingsState<Settings.Settings>(subject.atom);
          return <CodeSettings settings={settings} onSettingsChange={updateSettings} />;
        },
      }),
      Surface.create({
        id: 'pluginSpec',
        filter: AppSurface.subject(AppSurface.Article, isPluginSpecSubject),
        component: ({ data: { subject }, role }) => <SpecView role={role} content={subject.content} readOnly />,
      }),
    ]),
  ),
);
