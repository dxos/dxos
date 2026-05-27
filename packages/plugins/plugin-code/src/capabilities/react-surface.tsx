//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { DXN } from '@dxos/keys';
import { Surface, useSettingsState } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';

import { CodeArticle, CodeSettings, SpecArticle } from '#containers';
import { meta } from '#meta';
import { CodeProject, Settings, Spec } from '#types';

import { SpecView } from '../containers/SpecArticle/SpecArticle';
import { isPluginSpecSubject } from '../plugin-spec';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: DXN.make('org.dxos.plugin.code.surface.specArticle'),
        role: ['article', 'section'],
        filter: (data): data is { subject: Spec.Spec; attendableId?: string } =>
          Obj.instanceOf(Spec.Spec, data.subject) &&
          (data.attendableId === undefined || typeof data.attendableId === 'string'),
        component: ({ data: { subject, attendableId }, role }) => (
          <SpecArticle role={role} subject={subject} attendableId={attendableId} />
        ),
      }),
      Surface.create({
        id: DXN.make('org.dxos.plugin.code.surface.codeArticle'),
        role: ['article', 'section'],
        filter: (data): data is { subject: CodeProject.CodeProject; attendableId?: string } =>
          Obj.instanceOf(CodeProject.CodeProject, data.subject) &&
          (data.attendableId === undefined || typeof data.attendableId === 'string'),
        component: ({ data: { subject, attendableId }, role }) => (
          <CodeArticle role={role} subject={subject} attendableId={attendableId} />
        ),
      }),
      Surface.create({
        id: DXN.make('org.dxos.plugin.code.surface.codeSettings'),
        filter: AppSurface.settings(AppSurface.Article, meta.id),
        component: ({ data: { subject } }) => {
          const { settings, updateSettings } = useSettingsState<Settings.Settings>(subject.atom);
          return <CodeSettings settings={settings} onSettingsChange={updateSettings} />;
        },
      }),
      Surface.create({
        id: DXN.make('org.dxos.plugin.code.surface.pluginSpec'),
        filter: AppSurface.subject(AppSurface.Article, isPluginSpecSubject),
        component: ({ data: { subject }, role }) => <SpecView role={role} content={subject.content} readOnly />,
      }),
    ]),
  ),
);
