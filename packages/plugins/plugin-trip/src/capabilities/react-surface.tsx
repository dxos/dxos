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
      // Companion surface dispatched when a segment is selected within a Trip's
      // attendable context. Mirrors plugin-inbox's EventArticle pattern:
      // app-graph-builder.ts resolves the current selectionId into a
      // Segment.Any (or the 'segment' sentinel) and the layout dispatches this
      // surface with subject = segment, companionTo = trip. The filter accepts
      // either a tagged Segment object or the sentinel string.
      Surface.create({
        id: 'surface.segment',
        role: 'article',
        filter: (data): data is { subject: import('#types').Segment.Any | string; companionTo: Trip.Trip } => {
          if (typeof data !== 'object' || data === null) {
            return false;
          }
          const d = data as { subject?: unknown; companionTo?: unknown };
          if (!Trip.instanceOf(d.companionTo)) {
            return false;
          }
          if (typeof d.subject === 'string') {
            return d.subject === 'segment';
          }
          const tag = (d.subject as { _tag?: unknown })?._tag;
          return typeof tag === 'string' && ['flight', 'train', 'boat', 'road', 'lodging', 'activity'].includes(tag);
        },
        component: ({ data, role }) => (
          <SegmentArticle role={role} subject={data.subject} companionTo={data.companionTo} />
        ),
      }),
    ]),
  ),
);
