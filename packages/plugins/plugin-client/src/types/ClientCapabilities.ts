//
// Copyright 2025 DXOS.org
//

import type * as Atom from 'effect/unstable/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';
// Aliased: unwrapping the enclosing `namespace` put these in the same scope as the
// capabilities named after them.
import { type Client as Client$ } from '@dxos/client';
import { type ObjectMigration } from '@dxos/client/echo';
import { type Type } from '@dxos/echo';
import { type HubHttpClient as HubHttpClient$ } from '@dxos/edge-client';
import { type Identity as Identity$, type Space as Space$ } from '@dxos/halo';

import { meta } from '#meta';

import { type AccountCache as AccountCacheType } from './AccountCache';

export const Client = Capability.makeSingleton<Client$>()(`${meta.profile.key}.capability.client`);
export const Schema = Capability.make<Type.AnyEntity[]>()(`${meta.profile.key}.capability.schema`);
/**
 * Ordering marker: contributed by `SchemaDefs` once the initial batch of contributed schema has
 * been registered with the client. Requiring `AppCapabilities.Schema` only orders a module after
 * the schema PROVIDERS — two consumers of one capability have no ordering relative to each other —
 * so anything creating typed objects during first-run (before the idle wave registers them) must
 * require this instead. The value is `true` rather than `void` because an `undefined`
 * implementation reads as "not contributed" when the loader resolves a module's requires.
 */
export const SchemaRegistered = Capability.makeSingleton<true>()(`${meta.profile.key}.capability.schemaRegistered`);
export const Migration = Capability.make<ObjectMigration[]>()(`${meta.profile.key}.capability.migration`);
export const AccountCache = Capability.makeSingleton<Atom.Writable<AccountCacheType>>()(
  `${meta.profile.key}.capability.accountCache`,
);
export const HubHttpClient = Capability.makeSingleton<HubHttpClient$>()(`${meta.profile.key}.capability.hubHttpClient`);

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
