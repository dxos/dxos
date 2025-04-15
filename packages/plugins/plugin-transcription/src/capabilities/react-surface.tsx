//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';

import { TranscriptionContainer } from '../components';
import { TRANSCRIPTION_PLUGIN } from '../meta';
import { isTranscript, type TranscriptType } from '../types';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${TRANSCRIPTION_PLUGIN}/article/transcript`,
      role: ['article', 'section', 'tabpanel'],
      filter: (data): data is { subject: TranscriptType } => isTranscript(data.subject),
      component: ({ data, role }) => <TranscriptionContainer transcript={data.subject} role={role} />,
    }),
  ]);
