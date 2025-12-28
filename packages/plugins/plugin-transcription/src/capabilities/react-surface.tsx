//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, Capability, createSurface } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { Transcript } from '@dxos/types';

import { TranscriptionContainer } from '../components';
import { meta } from '../meta';

export default Capability.makeModule(() =>
  Capability.contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${meta.id}/article/transcript`,
      role: ['article', 'section'],
      filter: (data): data is { subject: Transcript.Transcript } => Obj.instanceOf(Transcript.Transcript, data.subject),
      component: ({ data, role }) => <TranscriptionContainer transcript={data.subject} role={role} />,
    }),
  ]),
);
