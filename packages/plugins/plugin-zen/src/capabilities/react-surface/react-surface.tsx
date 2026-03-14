//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { Obj } from '@dxos/echo';

import { ZenArticle } from '../../containers';
import { meta } from '../../meta';
import { Dream } from '../../types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: meta.id,
        role: ['article', 'section'],
        filter: (data): data is { subject: Dream.Dream } => Obj.instanceOf(Dream.Dream, data.subject),
        component: ({ data, role }) => <ZenArticle role={role} subject={data.subject} />,
      }),
    ]),
  ),
);
