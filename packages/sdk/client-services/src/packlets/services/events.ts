//
// Copyright 2025 DXOS.org
//

import { type Context } from '@dxos/context';
import { Event } from '@dxos/effect';
import { type Credential, type ProfileDocument } from '@dxos/protocols/buf/dxos/halo/credentials_pb';

import { type Identity } from '../identity/index.ts';

//
// Lifecycle events of the client stack. Boot order is the chain of these events, each layer
// subscribing to the fact it needs and emitting the fact it establishes:
//
//   StorageReady → IdentityLoaded → NetworkReady            (host, then cascades)
//   IdentityBound                                            (a created or accepted identity)
//   IdentityAvailable → DataSpacesReady                      (identity-bound services)
//   StackOpened                                              (everything above is done)
//
// Teardown has no events: each layer closes its component in its layer finalizer, so runtime
// disposal unwinds the stack in reverse build order.
//

type LifecyclePayload = { ctx: Context };

/** Storage has been migrated, version-checked, and loaded. */
export const StorageReady = Event.make<LifecyclePayload>()('client-services/StorageReady');

/** The identity manager is open; `identity` is the persisted identity, if there is one. */
export const IdentityLoaded = Event.make<LifecyclePayload & { identity?: Identity }>()(
  'client-services/IdentityLoaded',
);

/** Edge, signaling, and swarm networking are open with the current network identity. */
export const NetworkReady = Event.make<LifecyclePayload>()('client-services/NetworkReady');

/**
 * A new identity must be bound to the network before it joins; `deviceCredential` is present when
 * the identity was admitted by another device.
 */
export const IdentityBound = Event.make<LifecyclePayload & { identity: Identity; deviceCredential?: Credential }>()(
  'client-services/IdentityBound',
);

/** An identity has joined the network; identity-bound services may open. */
export const IdentityAvailable = Event.make<LifecyclePayload & { identity: Identity }>()(
  'client-services/IdentityAvailable',
);

/** The data space manager is open. */
export const DataSpacesReady = Event.make<LifecyclePayload & { identity: Identity }>()(
  'client-services/DataSpacesReady',
);

/** The open sequence has completed, with or without an identity. */
export const StackOpened = Event.make<LifecyclePayload>()('client-services/StackOpened');

/** The local profile changed and should be broadcast to every open space. */
export const ProfileUpdated = Event.make<{ profile: ProfileDocument }>()('client-services/ProfileUpdated');
