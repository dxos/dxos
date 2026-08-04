//
// Copyright 2025 DXOS.org
//

// React surface capability module.
// Surfaces are the rendering system — they connect graph nodes to React components.
// Each `Surface.create()` call registers a component for a specific role and data shape.
// The framework matches surfaces by role first, then applies the filter function to
// select the correct component for the current data.
//
// A container is registered as itself via `component`, and `props` maps the surface's data
// envelope onto the container's own props. The mapper's argument type comes from the same
// `filter` that defines the surface's data shape, so the unpacking is type-checked against it.
// A surface whose component needs hooks cannot use a mapper — see `SampleSurfaces.tsx`.

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Position } from '@dxos/util';

import { SampleArticle, SampleCompanionPanel, SampleProperties } from '#containers';
import { SampleItem } from '#types';

import { SampleDeckCompanionSurface, SampleStatusSurface } from './SampleSurfaces';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      // --- Article surface ---
      // The primary content view. `oneOf(object(Article, ...), object(Section, ...))`
      // registers this component for both full-article and inline-section roles.
      // The Article/Section tokens inherently require a string `attendableId` on
      // the data, matching the article data contract.
      Surface.create({
        id: 'article',
        filter: AppSurface.oneOf(
          AppSurface.object(AppSurface.Article, SampleItem.SampleItem),
          AppSurface.object(AppSurface.Section, SampleItem.SampleItem),
        ),
        component: SampleArticle,
        props: ({ role, data: { subject, attendableId } }) => ({ role, subject, attendableId }),
      }),

      // --- Object properties surface ---
      // Renders in the per-object properties panel (gear icon companion).
      // `AppSurface.object(AppSurface.ObjectProperties, Schema)` matches when viewing properties for this type.
      Surface.create({
        id: 'objectProperties',
        position: Position.first,
        filter: AppSurface.object(AppSurface.ObjectProperties, SampleItem.SampleItem),
        component: SampleProperties,
        props: ({ data: { subject } }) => ({ subject }),
      }),

      // --- Status indicator surface ---
      // `AppSurface.StatusIndicator` renders in the application status bar.
      Surface.create({
        id: 'sampleStatus',
        filter: Surface.makeFilter(AppSurface.StatusIndicator),
        component: SampleStatusSurface,
      }),

      // --- Companion article surface ---
      // Renders the plank companion panel for SampleItem objects.
      // `AppSurface.allOf()` composes two filters: the data must be a literal article
      // with id 'related' AND the companionTo must be a SampleItem.
      // The `data.companionTo` prop contains the parent ECHO object.
      Surface.create({
        id: 'relatedCompanion',
        filter: AppSurface.allOf(
          AppSurface.literal(AppSurface.Article, 'related'),
          AppSurface.companion(AppSurface.Article, SampleItem.SampleItem),
        ),
        component: SampleCompanionPanel,
        props: ({ data: { companionTo } }) => ({ companionTo }),
      }),

      // --- Deck companion surface ---
      // Renders the workspace-wide companion panel.
      // The variant id ('samplePanel') must match what AppNode.makeDeckCompanion passes
      // and what the deck consumer uses via AppSurface.deckCompanion('samplePanel').
      Surface.create({
        id: 'deckCompanion',
        filter: Surface.makeFilter(AppSurface.deckCompanion('samplePanel')),
        component: SampleDeckCompanionSurface,
      }),
    ]),
  ),
);
