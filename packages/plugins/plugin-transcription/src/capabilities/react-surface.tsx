//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';
import { SettingsStore } from '@dxos/local-storage';

import { TranscriptionContainer, TranscriptionSettings } from '../components';
import { meta } from '../meta';
import { isTranscript, type TranscriptionSettingsProps, type TranscriptType } from '../types';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${meta.id}/plugin-settings`,
      role: 'article',
      filter: (data): data is { subject: SettingsStore<TranscriptionSettingsProps> } =>
        data.subject instanceof SettingsStore && data.subject.prefix === meta.id,
      component: ({ data: { subject } }) => <TranscriptionSettings settings={subject.value} />,
    }),
    createSurface({
      id: `${meta.id}/article/transcript`,
      role: ['article', 'section'],
      filter: (data): data is { subject: TranscriptType } => isTranscript(data.subject),
      component: ({ data, role }) => <TranscriptionContainer transcript={data.subject} role={role} />,
    }),
  ]);
