//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { Capability } from '@dxos/app-framework';

import { SpaceCapabilities } from './capabilities';

/**
 * Module maker contributing a typed create-object entry.
 */
export const createObject = Capability.moduleMaker('CreateObject', SpaceCapabilities.CreateObjectEntry);
