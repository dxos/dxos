//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface, useCapability } from '@dxos/app-framework';
import { DocumentType } from '@dxos/plugin-markdown/types';
import { CollectionType } from '@dxos/plugin-space/types';

import { MarkdownSlide, PresenterSettings, PresenterMain, RevealMain } from '../components';
import { PRESENTER_PLUGIN } from '../meta';
import { type PresenterSettingsProps } from '../types';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${PRESENTER_PLUGIN}/document`,
      role: 'main',
      disposition: 'hoist',
      filter: (data): data is { subject: DocumentType } => data.subject instanceof DocumentType,
      component: ({ data }) => <RevealMain document={data.subject} />,
    }),
    createSurface({
      id: `${PRESENTER_PLUGIN}/collection`,
      role: 'main',
      disposition: 'hoist',
      filter: (data): data is { subject: CollectionType } => data.subject instanceof CollectionType,
      component: ({ data }) => <PresenterMain collection={data.subject} />,
    }),
    createSurface({
      id: `${PRESENTER_PLUGIN}/slide`,
      role: 'slide',
      filter: (data): data is { subject: DocumentType } => data.subject instanceof DocumentType,
      component: ({ data }) => <MarkdownSlide document={data.subject} />,
    }),
    createSurface({
      id: `${PRESENTER_PLUGIN}/settings`,
      role: 'settings',
      filter: (data): data is any => data.subject === PRESENTER_PLUGIN,
      component: () => {
        const settings = useCapability(Capabilities.SettingsStore).getStore<PresenterSettingsProps>(
          PRESENTER_PLUGIN,
        )!.value;
        return <PresenterSettings settings={settings} />;
      },
    }),
  ]);
