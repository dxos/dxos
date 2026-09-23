//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { Hook } from '@dxos/effect';
import { type Credential, type ProfileDocument } from '@dxos/protocols/buf/dxos/halo/credentials_pb';

import { type Identity } from './Identity.ts';

//
// Lifecycle events of the client stack. Boot order is the chain of these events, each layer
// subscribing to the fact it needs and emitting the fact it establishes:
//
//   Opening → StorageReady → IdentityLoaded → NetworkReady   (host emits Opening, then cascades).
//   IdentityBound                                            (a created or accepted identity).
//   IdentityAvailable → DataSpacesAvailable                      (identity-bound services).
//   StackOpened                                              (host, once the cascade is done).
//   NetworkingEnabled                                        (auto-connect, or the embedder).
//
// Teardown has no events: each layer closes its component in its layer finalizer, so runtime
// disposal unwinds the stack in reverse build order. A reset is the embedder's concern and runs on
// the embedder's controller, which outlives the stack:
//
//   Closing → WipingStorage → Reset                          (system service; the embedder handles).
//
// Payloads carry facts only. Cancellation and tracing ride on the Effect: a layer that needs a DXOS
// `Context` for a component takes one from its scope (`EffectEx.contextFromScope`), and the host
// emits under its open context (`EffectEx.withContext`) so handler spans nest under it.
//

/** The host is opening; nothing has been touched yet. */
export const Opening = Hook.make<void>()('client-services/Opening');

/** Storage has been migrated, version-checked, and loaded. */
export const StorageReady = Hook.make<void>()('client-services/StorageReady');

/** The identity manager is open; `identity` is the persisted identity, if there is one. */
export const IdentityLoaded = Hook.make<{ identity?: Identity }>()('client-services/IdentityLoaded');

/** Edge, signaling, and swarm networking are open with the current network identity. */
export const NetworkReady = Hook.make<void>()('client-services/NetworkReady');

/**
 * A new identity must be bound to the network before it joins; `deviceCredential` is present when
 * the identity was admitted by another device.
 */
export const IdentityBound = Hook.make<{ identity: Identity; deviceCredential?: Credential }>()(
  'client-services/IdentityBound',
);

/** An identity has joined the network; identity-bound services may open. */
export const IdentityAvailable = Hook.make<{ identity: Identity }>()('client-services/IdentityAvailable');

/** The data space manager is open. */
export const DataSpacesAvailable = Hook.make<{ identity: Identity }>()('client-services/DataSpacesAvailable');

/** The open sequence has completed, with or without an identity. */
export const StackOpened = Hook.make<void>()('client-services/StackOpened');

/** Outbound networking may begin; emitted on `StackOpened` when auto-connecting, else by the embedder. */
export const NetworkingEnabled = Hook.make<void>()('client-services/NetworkingEnabled');

/** A reset began: the embedder disposes the stack. */
export const Closing = Hook.make<void>()('client-services/Closing');

/** The stack is gone: the embedder wipes persisted storage so the next open starts fresh. */
export const WipingStorage = Hook.make<void>()('client-services/WipingStorage');

/** Storage is wiped; the embedder typically reloads. */
export const Reset = Hook.make<void>()('client-services/Reset');

/** The local profile changed and should be broadcast to every open space. */
export const ProfileUpdated = Hook.make<{ profile: ProfileDocument }>()('client-services/ProfileUpdated');
