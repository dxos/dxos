//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capability, Common } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { Transcript } from '@dxos/types';

import { TranscriptionContainer } from '../../components';
import { meta } from '../../meta';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Common.Capability.ReactSurface, [
      Common.createSurface({
        id: `${meta.id}/article/transcript`,
        role: ['article', 'section'],
        filter: (data): data is { subject: Transcript.Transcript } =>
          Obj.instanceOf(Transcript.Transcript, data.subject),
        component: ({ data, role }) => <TranscriptionContainer transcript={data.subject} role={role} />,
      }),
    ]),
  ),
);
