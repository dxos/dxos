//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface, useSettingsState } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Collection, Obj } from '@dxos/echo';
import { Markdown } from '@dxos/plugin-markdown';

import { PresenterSettings } from '#components';
import { CollectionPresenterArticle, DocumentPresenterContainer, MarkdownSlide } from '#containers';
import { meta } from '#meta';
import { type Settings } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'document',
        position: 'first',
        filter: Surface.makeFilter(
          AppSurface.Article,
          (data): data is AppSurface.ArticleData<{ type: typeof meta.id; object: Markdown.Document }> =>
            !!data.subject &&
            typeof data.subject === 'object' &&
            'type' in data.subject &&
            'object' in data.subject &&
            data.subject.type === meta.id &&
            Obj.instanceOf(Markdown.Document, data.subject.object),
        ),
        component: ({ data }) => <DocumentPresenterContainer document={data.subject.object} />,
      }),
      Surface.create({
        id: 'collection',
        position: 'first',
        filter: Surface.makeFilter(
          AppSurface.Article,
          (data): data is AppSurface.ArticleData<{ type: typeof meta.id; object: Collection.Collection }> =>
            !!data.subject &&
            typeof data.subject === 'object' &&
            'type' in data.subject &&
            'object' in data.subject &&
            data.subject.type === meta.id &&
            Obj.instanceOf(Collection.Collection, data.subject.object),
        ),
        component: ({ role, data }) => <CollectionPresenterArticle role={role} subject={data.subject.object} />,
      }),
      Surface.create({
        id: 'slide',
        filter: AppSurface.object(AppSurface.Slide, Markdown.Document),
        component: ({ data }) => <MarkdownSlide document={data.subject} />,
      }),
      Surface.create({
        id: 'pluginSettings',
        filter: AppSurface.settings(AppSurface.Article, meta.id),
        component: ({ data: { subject } }) => {
          const { settings, updateSettings } = useSettingsState<Settings.Settings>(subject.atom);
          return <PresenterSettings settings={settings} onSettingsChange={updateSettings} />;
        },
      }),
    ]),
  ),
);
