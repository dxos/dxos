//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import { DXN } from '@dxos/keys';
import * as ProjectCapabilities from '@dxos/plugin-projects/ProjectCapabilities';

import FeatureSurface from '../capabilities/feature-surface.ts';
import SpecExtensions from '../capabilities/spec-extensions.ts';
import * as FeatureOperationHandlerSet from '../FeatureOperationHandlerSet.ts';

const OperationHandler = Capability.inlineModule(
  'FeatureEditingOperationHandler',
  { provides: [Capabilities.OperationHandler] },
  () => Effect.succeed([Capability.contribute(Capabilities.OperationHandler, FeatureOperationHandlerSet.handlers)]),
);

const SpecEditing = Capability.inlineModule(
  'FeatureEditingSpecExtensions',
  { provides: [ProjectCapabilities.SpecExtensions, ProjectCapabilities.SpecPackage, ProjectCapabilities.SpecView] },
  () => SpecExtensions(),
);

const Surfaces = Capability.inlineModule('FeatureEditingSurfaces', { provides: [Capabilities.ReactSurface] }, () =>
  FeatureSurface(),
);

/**
 * Contributes the plugin's feature stack alone (its operation handlers, spec editing and surfaces), so stories can edit
 * features without the whole plugin.
 */
export const make = Plugin.define(
  Plugin.makeMeta({
    key: DXN.make('org.dxos.plugin.code.testing.featureEditing'),
    name: 'Feature editing',
  }),
).pipe(Plugin.addModule(OperationHandler), Plugin.addModule(SpecEditing), Plugin.addModule(Surfaces), Plugin.make);
