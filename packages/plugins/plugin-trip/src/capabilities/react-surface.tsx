//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { TripArticle } from '#containers';
import { Trip } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'surface.trip',
        filter: AppSurface.oneOf(
          AppSurface.object(AppSurface.Article, Trip.Trip),
          AppSurface.object(AppSurface.Section, Trip.Trip),
        ),
        component: ({ data, role }) => (
          <TripArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
    ]),
  ),
);
