//
// Copyright 2025 DXOS.org
//

// React surface capability module.
// Surfaces are the rendering system — they connect graph nodes to React components.
// Each `Surface.create()` call registers a component for a specific role and data shape.
// The framework matches surfaces by role first, then applies the filter function to
// select the correct component for the current data.

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface, useAtomCapability, useSettingsState } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { SampleStatusIndicator } from '#components';
import {
  SampleArticle,
  SampleCompanionPanel,
  SampleDeckCompanion,
  SampleProperties,
  SampleSettings,
} from '#containers';
import { meta } from '#meta';
import { SampleCapabilities, SampleItem, type Settings } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      // --- Article surface ---
      // The primary content view. `role: ['article', 'section']` means this component
      // renders in both full-article and inline-section contexts.
      // `AppSurface.objectArticle(Schema)` is a type-safe filter that matches when the
      // surface data contains an ECHO object of the specified type with an attendableId.
      Surface.create({
        id: 'article',
        role: ['article', 'section'],
        filter: AppSurface.objectArticle(SampleItem.SampleItem),
        component: ({ data, role }) => (
          <SampleArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),

      // --- Object properties surface ---
      // Renders in the per-object properties panel (gear icon companion).
      // `AppSurface.objectProperties(Schema)` matches when viewing properties for this type.
      Surface.create({
        id: 'object-properties',
        role: 'object-properties',
        position: 'hoist',
        filter: AppSurface.objectProperties(SampleItem.SampleItem),
        component: ({ data }) => <SampleProperties subject={data.subject} />,
      }),

      // --- Plugin settings surface ---
      // Renders the plugin's settings page in the global settings panel.
      // `useSettingsState` is called here (in the surface component) to destructure
      // the atom into typed `settings` and `updateSettings`. The settings component
      // receives these as props via `SettingsArticleProps<T>` and never touches the atom.
      Surface.create({
        id: 'plugin-settings',
        role: 'article',
        filter: AppSurface.settingsArticle(meta.id),
        component: ({ data: { subject } }) => {
          const { settings, updateSettings } = useSettingsState<Settings.Settings>(subject.atom);
          return <SampleSettings settings={settings} onSettingsChange={updateSettings} />;
        },
      }),

      // --- Status indicator surface ---
      // `role: 'status-indicator'` renders in the application status bar.
      // `useAtomCapability` subscribes to the settings atom reactively so the
      // indicator hides/shows when the setting is toggled. This must be in the
      // component (not the filter) so the atom subscription triggers re-renders.
      Surface.create({
        id: 'status',
        role: 'status-indicator',
        component: () => {
          const settings = useAtomCapability(SampleCapabilities.Settings);
          return settings.showStatusIndicator !== false ? <SampleStatusIndicator /> : null;
        },
      }),

      // --- Companion article surface ---
      // Renders the plank companion panel for SampleItem objects.
      // `AppSurface.and()` composes two filters: the data must be a literal article
      // with id 'related' AND the companionTo must be an SampleItem.
      // The `data.companionTo` prop contains the parent ECHO object.
      Surface.create({
        id: 'related-companion',
        role: 'article',
        filter: AppSurface.and(
          AppSurface.literalArticle('related'),
          AppSurface.companionArticle(SampleItem.SampleItem),
        ),
        component: ({ data }) => <SampleCompanionPanel companionTo={data.companionTo} />,
      }),

      // --- Deck companion surface ---
      // Renders the workspace-wide companion panel.
      // The role follows the convention: `deck-companion--{id}` where `{id}` matches
      // the `data` field from `AppNode.makeDeckCompanion` in the graph builder.
      // `AppSurface.literalSection(id)` matches the literal section data.
      Surface.create({
        id: 'deck-companion',
        role: 'deck-companion--sample-panel',
        filter: AppSurface.literalSection('sample-panel'),
        component: () => <SampleDeckCompanion />,
      }),
    ]),
  ),
);
