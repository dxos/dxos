//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface, useCapability } from '@dxos/app-framework';
import { SettingsStore } from '@dxos/local-storage';
import { DocumentType } from '@dxos/plugin-markdown/types';
import { CollectionType } from '@dxos/plugin-space/types';

import { PresenterCapabilities } from './capabilities';
import { MarkdownSlide, PresenterSettings, PresenterMain, RevealMain } from '../components';
import { PRESENTER_PLUGIN } from '../meta';
import { PresenterContext, type PresenterSettingsProps } from '../types';
import { isInstanceOf } from '@dxos/echo-schema';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${PRESENTER_PLUGIN}/document`,
      role: 'main',
      position: 'hoist',
      filter: (data): data is { subject: DocumentType } => isInstanceOf(DocumentType, data.subject),
      component: ({ data }) => <RevealMain document={data.subject} />,
    }),
    createSurface({
      id: `${PRESENTER_PLUGIN}/collection`,
      role: 'main',
      position: 'hoist',
      filter: (data): data is { subject: CollectionType } => data.subject instanceof CollectionType,
      component: ({ data }) => {
        const state = useCapability(PresenterCapabilities.MutableState);

        return (
          <PresenterContext.Provider
            value={{
              running: state.presenting,
              start: () => (state.presenting = true),
              stop: () => (state.presenting = false),
            }}
          >
            <PresenterMain collection={data.subject} />
          </PresenterContext.Provider>
        );
      },
    }),
    createSurface({
      id: `${PRESENTER_PLUGIN}/slide`,
      role: 'slide',
      filter: (data): data is { subject: DocumentType } => isInstanceOf(DocumentType, data.subject),
      component: ({ data }) => <MarkdownSlide document={data.subject} />,
    }),
    createSurface({
      id: `${PRESENTER_PLUGIN}/settings`,
      role: 'article',
      filter: (data): data is { subject: SettingsStore<PresenterSettingsProps> } =>
        data.subject instanceof SettingsStore && data.subject.prefix === PRESENTER_PLUGIN,
      component: ({ data: { subject } }) => <PresenterSettings settings={subject.value} />,
    }),
  ]);
