//
// Copyright 2025 DXOS.org
//

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ClientEvents from '@dxos/plugin-client/ClientEvents';

import { SpaceCapabilities, SpaceCapability, SpaceSchema } from '#types';

import { SpaceOperationConfig } from '../operations/helpers';
import { makeCreateInvitationUrl } from './helpers';

export const Commands = AppCapability.commands(() => import('./commands'));
export const CreateObject = SpaceCapability.createObject(() => import('./create-object'));
export const IdentityCreated = Capability.lazyModule(
  'IdentityCreated',
  {
    requires: [ClientCapabilities.Client],
    provides: [SpaceCapabilities.DefaultSpace],
    // Runtime event: the default space is created when a local identity is created, not at startup.
    activatesOn: ClientEvents.IdentityCreated,
  },
  () => import('./identity-created'),
);
export const OperationHandler = Capability.lazyModule(
  'OperationHandler',
  { provides: [Capabilities.OperationHandler] },
  () => import('./operation-handler'),
);
export const UndoMappings = Capability.lazyModule(
  'UndoMappings',
  {
    provides: [Capabilities.UndoMapping, SpaceOperationConfig],
    props: (options: SpaceSchema.SpacePluginOptions) => ({
      createInvitationUrl: makeCreateInvitationUrl(options),
      observability: options.observability,
    }),
  },
  () => import('./undo-mappings'),
);

// Node-specific schema subset; loaded from the sibling headless schema list rather than the
// browser `./schema` module.
export const Schema = AppCapability.schema(() => import('../schema.node'));

// Stubs for modules not flagged for node: the canonical plugin entry lists every module and
// `Plugin.addModule` skips `undefined`.
export const AppGraphBuilder = undefined;
export const NavigationHandler = undefined;
export const NavigationTargetResolver = undefined;
export const PluginAsset = undefined;
export const ReactRoot = undefined;
export const ReactSurface = undefined;
export const Repair = undefined;
export const SpaceSettings = undefined;
export const SpacesReady = undefined;
export const SpaceState = undefined;
export const Translations = undefined;
