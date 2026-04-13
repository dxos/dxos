//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { DemoPanel } from '#containers';
import { Demo } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'demo-controller',
        role: ['article', 'section'],
        filter: AppSurface.objectArticle(Demo.DemoController),
        component: ({ data, role }) => <DemoPanel role={role} subject={data.subject} />,
      }),
    ]),
  ),
);
