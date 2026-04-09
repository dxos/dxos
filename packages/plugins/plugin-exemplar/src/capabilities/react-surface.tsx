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

import { ExemplarStatusIndicator } from '#components';
import {
  ExemplarArticle,
  ExemplarCompanionPanel,
  ExemplarDeckCompanion,
  ExemplarObjectSettings,
  ExemplarSettings,
} from '#containers';
import { meta } from '#meta';
import { ExemplarCapabilities, ExemplarItem, type Settings } from '#types';

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
        filter: AppSurface.objectArticle(ExemplarItem.ExemplarItem),
        component: ({ data, role }) => (
          <ExemplarArticle role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),

      // --- Object settings surface ---
      // Renders in the per-object settings panel (gear icon companion).
      // `AppSurface.objectSettings(Schema)` matches when viewing settings for this type.
      Surface.create({
        id: 'object-settings',
        role: 'object-settings',
        position: 'hoist',
        filter: AppSurface.objectSettings(ExemplarItem.ExemplarItem),
        component: ({ data }) => <ExemplarObjectSettings subject={data.subject} />,
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
          return <ExemplarSettings settings={settings} onSettingsChange={updateSettings} />;
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
          const settings = useAtomCapability(ExemplarCapabilities.Settings);
          return settings.showStatusIndicator !== false ? <ExemplarStatusIndicator /> : null;
        },
      }),

      // --- Companion article surface ---
      // Renders the plank companion panel for ExemplarItem objects.
      // `AppSurface.and()` composes two filters: the data must be a literal article
      // with id 'related' AND the companionTo must be an ExemplarItem.
      // The `data.companionTo` prop contains the parent ECHO object.
      Surface.create({
        id: 'related-companion',
        role: 'article',
        filter: AppSurface.and(
          AppSurface.literalArticle('related'),
          AppSurface.companionArticle(ExemplarItem.ExemplarItem),
        ),
        component: ({ data }) => <ExemplarCompanionPanel companionTo={data.companionTo} />,
      }),

      // --- Deck companion surface ---
      // Renders the workspace-wide companion panel.
      // The role follows the convention: `deck-companion--{id}` where `{id}` matches
      // the `data` field from `AppNode.makeDeckCompanion` in the graph builder.
      // `AppSurface.literalSection(id)` matches the literal section data.
      Surface.create({
        id: 'deck-companion',
        role: 'deck-companion--exemplar-panel',
        filter: AppSurface.literalSection('exemplar-panel'),
        component: () => <ExemplarDeckCompanion />,
      }),
    ]),
  ),
);
