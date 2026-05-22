//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { SegmentArticle, TripArticle } from '#containers';
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
      Surface.create({
        id: 'surface.segment',
        role: 'article',
        filter: (data): data is { attendableId: string; companionTo: Trip.Trip } =>
          typeof data === 'object' &&
          data !== null &&
          typeof (data as { attendableId?: unknown }).attendableId === 'string' &&
          Trip.instanceOf((data as { companionTo?: unknown }).companionTo),
        component: ({ data, role }) => (
          <SegmentArticle role={role} attendableId={data.attendableId} companionTo={data.companionTo} />
        ),
      }),
    ]),
  ),
);
