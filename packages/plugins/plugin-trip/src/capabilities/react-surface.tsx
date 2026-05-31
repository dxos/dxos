//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { SegmentArticle, TripArticle, TripMapArticle } from '#containers';
import { Segment, Trip } from '#types';

/** Role for the Trip map surface, rendered inline by TripArticle (globe / map variants). */
const TripMapRole = Surface.makeType<{ subject: Trip.Trip; attendableId: string }>('trip-map');

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
      // Inline map surface (globe / map variants) rendered by TripArticle when the
      // globe is toggled on. Reads the current segment selection via useSelected.
      Surface.create({
        id: 'surface.tripMap',
        filter: AppSurface.object(TripMapRole, Trip.Trip),
        component: ({ data }) => <TripMapArticle subject={data.subject} attendableId={data.attendableId} />,
      }),
      // Companion surface dispatched when a segment is selected within a
      // Trip's attendable context. Mirrors plugin-inbox's EventArticle
      // pattern: app-graph-builder.ts resolves the current selectionId into
      // a live Segment ECHO object and the layout dispatches this surface
      // with subject = segment, companionTo = trip. When no segment is
      // selected the graph builder's 'segment' sentinel falls through and
      // the surface simply doesn't render.
      Surface.create({
        id: 'surface.segment',
        filter: AppSurface.allOf(
          AppSurface.object(AppSurface.Article, Segment.Segment),
          AppSurface.companion(AppSurface.Article, Trip.Trip),
        ),
        component: ({ data, role }) => (
          <SegmentArticle
            role={role}
            subject={data.subject}
            companionTo={data.companionTo}
            attendableId={data.attendableId}
          />
        ),
      }),
    ]),
  ),
);
