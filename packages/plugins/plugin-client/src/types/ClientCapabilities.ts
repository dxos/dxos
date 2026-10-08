//
// Copyright 2025 DXOS.org
//

import type * as Effect from 'effect/Effect';
import type * as Atom from 'effect/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';
// Aliased: unwrapping the enclosing `namespace` put these in the same scope as the
// capabilities named after them.
import { type Client as Client$ } from '@dxos/client';
import { type Config as Config$ } from '@dxos/config';
import { type Type, type Hypergraph as Hypergraph$, type Migration as Migration$ } from '@dxos/echo';
import { type EdgeHttpClient as EdgeHttpClient$, type HubHttpClient as HubHttpClient$ } from '@dxos/edge-client';
import { type Identity as Identity$, type Space as Space$ } from '@dxos/halo';

import { meta } from '#meta';

import { type AccountCache as AccountCacheType } from './AccountCache.ts';

export const Client = Capability.makeSingleton<Client$>()(`${meta.profile.key}.capability.client`);
export const Schema = Capability.make<Type.AnyEntity[]>()(`${meta.profile.key}.capability.schema`);
/**
 * The effective `initializeTimeout` the client capability resolved. Consumers that wait on
 * `client.waitUntilInitialized()` bound themselves by this rather than the default, so a host that
 * widens the client's initialization budget does not have its layers time out underneath it.
 */
export const InitializeTimeout = Capability.makeSingleton<number>()(`${meta.profile.key}.capability.initializeTimeout`);
/**
 * Ordering marker for modules that create typed objects: requiring `Schema` only orders after the
 * schema PROVIDERS, which says nothing about `SchemaDefs`, the fellow consumer that registers them.
 * `true` rather than `void` — the loader reads an `undefined` implementation as not contributed.
 */
export const SchemaRegistered = Capability.makeSingleton<true>()(`${meta.profile.key}.capability.schemaRegistered`);
export const Migration = Capability.make<Migration$.Migration[]>()(`${meta.profile.key}.capability.migration`);
export const AccountCache = Capability.makeSingleton<Atom.Writable<AccountCacheType>>()(
  `${meta.profile.key}.capability.accountCache`,
);
/**
 * Runs after the local identity is deleted in place, before the flow that brings in the next one.
 * `target` names that flow — `deviceInvitation` or `recoverIdentity` — and is absent for a plain
 * logout, which leaves the app with no identity for a contributor (e.g. onboarding) to resolve.
 */
export type OnIdentityDeleted = (params: { target?: string }) => Effect.Effect<void, Error>;
export const OnIdentityDeleted = Capability.make<OnIdentityDeleted>()(
  `${meta.profile.key}.capability.onIdentityDeleted`,
);
export const HubHttpClient = Capability.makeSingleton<HubHttpClient$>()(`${meta.profile.key}.capability.hubHttpClient`);

/**
 * The client's runtime configuration, for consumers that need a config value (e.g. the EDGE URL)
 * without depending on `@dxos/client`. Contributed once the client has initialized.
 */
export const Config = Capability.makeSingleton<Config$>()(`${meta.profile.key}.capability.config`);
/**
 * The EDGE HTTP client, for consumers that call EDGE endpoints without depending on `@dxos/client`.
 * Absent when the config names no EDGE URL.
 */
export const EdgeHttpClient = Capability.makeSingleton<EdgeHttpClient$>()(
  `${meta.profile.key}.capability.edgeHttpClient`,
);
/** The cross-space ECHO graph, for imperative consumers that must find a space's database by id. */
export const Hypergraph = Capability.makeSingleton<Hypergraph$.Hypergraph>()(
  `${meta.profile.key}.capability.hypergraph`,
);

/**
 * The HALO Identity service instance, for imperative (non-React, non-Effect-layer) consumers
 * that need identity access without depending on `@dxos/client`.
 */
export const IdentityService = Capability.makeSingleton<Identity$.ServiceApi>()(
  `${meta.profile.key}.capability.identityService`,
);
/** The HALO Space service instance, for imperative consumers. */
export const SpaceService = Capability.makeSingleton<Space$.ServiceApi>()(
  `${meta.profile.key}.capability.spaceService`,
);
