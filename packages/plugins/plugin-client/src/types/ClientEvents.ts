//
// Copyright 2025 DXOS.org
//

import * as ActivationEvent from '@dxos/app-framework/ActivationEvent';

import { meta } from '#meta';

/**
 * Runtime event: `client.initialize()` (forked off the startup pass) has completed, so the client is
 * ready — from its boot cache when it opened from one, before its services answer. Modules whose
 * activation bodies need an initialized client (sync `halo`/`spaces` reads) ride this instead of the
 * startup dependency pass, which no longer implies initialization.
 */
export const Initialized = ActivationEvent.make(`${meta.profile.key}.event.initialized`);
/**
 * Runtime event: the client services are open and answering (`client.waitUntilServicesReady()`),
 * fired after {@link Initialized}'s wave. Modules that need what only the services can report —
 * metrics, platform details, RPC round trips that must not queue behind a deferred worker — ride
 * this; anything that can work from the boot cache rides {@link Initialized}.
 */
export const ServicesReady = ActivationEvent.make(`${meta.profile.key}.event.servicesReady`);
export const IdentityCreated = ActivationEvent.make(`${meta.profile.key}.event.identityCreated`);
/**
 * Runtime event: the space list is observable. The spaces themselves may still be opening, so a
 * module that reads a space's properties waits for that space rather than for this. Fired as soon as
 * the client is ready, without waiting for {@link Initialized}'s wave to finish, so a module riding
 * this must `require` any capability it reads from that wave.
 */
export const SpacesAvailable = ActivationEvent.make(`${meta.profile.key}.event.spacesAvailable`);
