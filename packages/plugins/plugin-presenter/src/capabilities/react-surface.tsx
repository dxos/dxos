//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { SettingsStore } from '@dxos/local-storage';
import { Markdown } from '@dxos/plugin-markdown/types';
import { DataType } from '@dxos/schema';

import {
  MarkdownSlide,
  PresenterSettings,
  DocumentPresenterContainer,
  CollectionPresenterContainer,
} from '../components';
import { PRESENTER_PLUGIN } from '../meta';
import { type PresenterSettingsProps } from '../types';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${PRESENTER_PLUGIN}/document`,
      role: 'article',
      position: 'hoist',
      filter: (data): data is { subject: Markdown.Doc; variant: 'presenter' } =>
        Obj.instanceOf(Markdown.Doc, data.subject) && data.variant === 'presenter',
      component: ({ data }) => <DocumentPresenterContainer document={data.subject} />,
    }),
    createSurface({
      id: `${PRESENTER_PLUGIN}/collection`,
      role: 'article',
      position: 'hoist',
      filter: (data): data is { subject: DataType.Collection; variant: 'presenter' } =>
        Obj.instanceOf(DataType.Collection, data.subject) && data.variant === 'presenter',
      component: ({ data }) => <CollectionPresenterContainer collection={data.subject} />,
    }),
    createSurface({
      id: `${PRESENTER_PLUGIN}/slide`,
      role: 'slide',
      filter: (data): data is { subject: Markdown.Doc } => Obj.instanceOf(Markdown.Doc, data.subject),
      component: ({ data }) => <MarkdownSlide document={data.subject} />,
    }),
    createSurface({
      id: `${PRESENTER_PLUGIN}/plugin-settings`,
      role: 'article',
      filter: (data): data is { subject: SettingsStore<PresenterSettingsProps> } =>
        data.subject instanceof SettingsStore && data.subject.prefix === PRESENTER_PLUGIN,
      component: ({ data: { subject } }) => <PresenterSettings settings={subject.value} />,
    }),
  ]);
