//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import { DXN } from '@dxos/keys';

import { ProjectOperationHandlerSet } from '#operations';
import { ProjectCapabilities } from '#types';

import SpecExtensions from '../capabilities/spec-extensions.ts';

const OperationHandler = Capability.inlineModule(
  'FeatureEditingOperationHandler',
  { provides: [Capabilities.OperationHandler] },
  () => Effect.succeed([Capability.contribute(Capabilities.OperationHandler, ProjectOperationHandlerSet.handlers)]),
);

const SpecEditing = Capability.inlineModule(
  'FeatureEditingSpecExtensions',
  { provides: [ProjectCapabilities.SpecExtensions, ProjectCapabilities.SpecPackage] },
  () => SpecExtensions(),
);

/**
 * Contributes the plugin's operation handlers and its spec editing alone, so stories can edit features without the
 * whole plugin.
 */
export const make = Plugin.define(
  Plugin.makeMeta({
    key: DXN.make('org.dxos.plugin.projects.testing.featureEditing'),
    name: 'Feature editing',
  }),
).pipe(Plugin.addModule(OperationHandler), Plugin.addModule(SpecEditing), Plugin.make);
