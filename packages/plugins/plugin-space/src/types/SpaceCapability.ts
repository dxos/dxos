//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Capability from '@dxos/app-framework/Capability';

import { SpaceCapabilities } from './capabilities';
import { SpaceEvents } from './events';

/**
 * Module maker contributing a typed create-object entry. Gated by default on the create flow
 * opening (all consumers read the entries reactively); declare `activatesOn` to override.
 */
export const createObject = Capability.moduleMaker('CreateObject', SpaceCapabilities.CreateObjectEntry, {
  activatesOn: SpaceEvents.CreateObjectRequested,
});
