//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { SegmentArticle, TripArticle } from '#containers';
import { Segment, Trip } from '#types';

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
      // Companion surface dispatched when a segment is selected within a
      // Trip's attendable context. Mirrors plugin-inbox's EventArticle
      // pattern: app-graph-builder.ts resolves the current selectionId into
      // a live Segment ECHO object (or the 'segment' sentinel) and the
      // layout dispatches this surface with subject = segment,
      // companionTo = trip.
      Surface.create({
        id: 'surface.segment',
        role: 'article',
        filter: (data): data is { subject: Segment.Segment | string; companionTo: Trip.Trip } => {
          if (typeof data !== 'object' || data === null) {
            return false;
          }
          const d = data as { subject?: unknown; companionTo?: unknown };
          if (!Trip.instanceOf(d.companionTo)) {
            return false;
          }
          return typeof d.subject === 'string' ? d.subject === 'segment' : Segment.instanceOf(d.subject);
        },
        component: ({ data, role }) => (
          <SegmentArticle role={role} subject={data.subject} companionTo={data.companionTo} />
        ),
      }),
    ]),
  ),
);
