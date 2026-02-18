//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { Obj } from '@dxos/echo';
import { Transcript } from '@dxos/types';

import { TranscriptionContainer } from '../../components';
import { meta } from '../../meta';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: `${meta.id}/article/transcript`,
        role: ['article', 'section'],
        filter: (data): data is { subject: Transcript.Transcript } =>
          Obj.instanceOf(Transcript.Transcript, data.subject),
        component: ({ data, role }) => <TranscriptionContainer role={role} subject={data.subject} />,
      }),
    ]),
  ),
);
