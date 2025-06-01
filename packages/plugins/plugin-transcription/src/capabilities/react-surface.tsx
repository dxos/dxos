//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';
import { isInstanceOf } from '@dxos/echo-schema';

import { TranscriptionContainer } from '../components';
import { meta } from '../meta';
import { TranscriptType } from '../types';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${meta.id}/article/transcript`,
      role: ['article', 'section'],
      filter: (data): data is { subject: TranscriptType } => isInstanceOf(TranscriptType, data.subject),
      component: ({ data, role }) => <TranscriptionContainer transcript={data.subject} role={role} />,
    }),
  ]);
