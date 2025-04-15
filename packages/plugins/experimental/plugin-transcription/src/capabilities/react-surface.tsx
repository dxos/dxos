//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';
import { getSchemaTypename, isInstanceOf } from '@dxos/echo-schema';
import { MeetingType } from '@dxos/plugin-meeting/types';

import { TranscriptionContainer } from '../components';
import { TRANSCRIPTION_PLUGIN } from '../meta';
import { isTranscript, TranscriptType } from '../types';

const transcriptTypename = getSchemaTypename(TranscriptType)!;

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${TRANSCRIPTION_PLUGIN}/article/transcript`,
      role: ['article', 'section'],
      filter: (data): data is { subject: TranscriptType } => isTranscript(data.subject),
      component: ({ data, role }) => <TranscriptionContainer transcript={data.subject} role={role} />,
    }),
    createSurface({
      id: `${TRANSCRIPTION_PLUGIN}/article/meeting-transcript`,
      role: ['article', 'section'],
      filter: (data): data is { subject: MeetingType } =>
        isInstanceOf(MeetingType, data.subject) &&
        data.variant === transcriptTypename &&
        isTranscript(data.subject.artifacts[transcriptTypename]?.target),
      component: ({ data, role }) => (
        <TranscriptionContainer
          transcript={data.subject.artifacts[transcriptTypename].target as TranscriptType}
          role={role}
        />
      ),
    }),
  ]);
