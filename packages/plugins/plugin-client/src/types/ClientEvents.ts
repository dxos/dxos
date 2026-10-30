//
// Copyright 2025 DXOS.org
//

import * as ActivationEvent from '@dxos/app-framework/ActivationEvent';

import { ClientNamespace } from '../namespace.ts';

/**
 * Runtime event: `client.initialize()` (forked off the startup pass) has completed. Modules
 * whose activation bodies need an initialized client (sync `halo`/`spaces` reads) ride this
 * instead of the startup dependency pass, which no longer implies initialization.
 */
export const Initialized = ActivationEvent.make(`${ClientNamespace.key}.event.initialized`);
export const IdentityCreated = ActivationEvent.make(`${ClientNamespace.key}.event.identityCreated`);
/**
 * Runtime event: the space list is observable. The spaces themselves may still be opening, so a
 * module that reads a space's properties waits for that space rather than for this.
 */
export const SpacesAvailable = ActivationEvent.make(`${ClientNamespace.key}.event.spacesAvailable`);
