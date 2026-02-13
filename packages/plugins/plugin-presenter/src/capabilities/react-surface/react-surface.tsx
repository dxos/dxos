//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface, useSettingsState } from '@dxos/app-framework/ui';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Obj } from '@dxos/echo';
import { Markdown } from '@dxos/plugin-markdown/types';
import { Collection } from '@dxos/schema';

import {
  CollectionPresenterContainer,
  DocumentPresenterContainer,
  MarkdownSlide,
  PresenterSettings,
} from '../../components';
import { meta } from '../../meta';
import { type PresenterSettingsProps } from '../../types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: `${meta.id}/document`,
        role: 'article',
        position: 'hoist',
        filter: (data): data is { subject: { type: typeof meta.id; object: Markdown.Document } } =>
          !!data.subject &&
          typeof data.subject === 'object' &&
          'type' in data.subject &&
          'object' in data.subject &&
          data.subject.type === meta.id &&
          Obj.instanceOf(Markdown.Document, data.subject.object),
        component: ({ data }) => <DocumentPresenterContainer document={data.subject.object} />,
      }),
      Surface.create({
        id: `${meta.id}/collection`,
        role: 'article',
        position: 'hoist',
        filter: (data): data is { subject: { type: typeof meta.id; object: Collection.Collection } } =>
          !!data.subject &&
          typeof data.subject === 'object' &&
          'type' in data.subject &&
          'object' in data.subject &&
          data.subject.type === meta.id &&
          Obj.instanceOf(Collection.Collection, data.subject.object),
        component: ({ role, data }) => <CollectionPresenterContainer role={role} subject={data.subject.object} />,
      }),
      Surface.create({
        id: `${meta.id}/slide`,
        role: 'slide',
        filter: (data): data is { subject: Markdown.Document } => Obj.instanceOf(Markdown.Document, data.subject),
        component: ({ data }) => <MarkdownSlide document={data.subject} />,
      }),
      Surface.create({
        id: `${meta.id}/plugin-settings`,
        role: 'article',
        filter: (data): data is { subject: AppCapabilities.Settings } =>
          AppCapabilities.isSettings(data.subject) && data.subject.prefix === meta.id,
        component: ({ data: { subject } }) => {
          const { settings, updateSettings } = useSettingsState<PresenterSettingsProps>(subject.atom);
          return <PresenterSettings settings={settings} onSettingsChange={updateSettings} />;
        },
      }),
    ]),
  ),
);
