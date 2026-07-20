//
// Copyright 2025 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';
import type * as Context from 'effect/Context';

import { Capability } from '@dxos/app-framework';
import { type Client } from '@dxos/client';
import { type ObjectMigration } from '@dxos/client/echo';
import { type Type } from '@dxos/echo';
import { type HubHttpClient } from '@dxos/edge-client';
import { type Identity, type Space } from '@dxos/halo';
// Explicit import so the emitted `.d.ts` references the package via its public alias
// instead of a relative `node_modules` path (TS2883).
// eslint-disable-next-line unused-imports/no-unused-imports
import type { Invitation } from '@dxos/halo';

import { meta } from '#meta';

import { type AccountCache as AccountCacheType } from './account-cache';

export namespace ClientCapabilities {
  export const Client = Capability.makeSingleton<Client>(`${meta.profile.key}.capability.client`);
  export const Schema = Capability.make<Type.AnyEntity[]>(`${meta.profile.key}.capability.schema`);
  export const Migration = Capability.make<ObjectMigration[]>(`${meta.profile.key}.capability.migration`);
  export const AccountCache = Capability.makeSingleton<Atom.Writable<AccountCacheType>>(
    `${meta.profile.key}.capability.accountCache`,
  );
  export const HubHttpClient = Capability.makeSingleton<HubHttpClient>(`${meta.profile.key}.capability.hubHttpClient`);

  /**
   * The HALO Identity service instance, for imperative (non-React, non-Effect-layer) consumers
   * that need identity access without depending on `@dxos/client`.
   */
  export const IdentityService = Capability.makeSingleton<Context.Tag.Service<Identity.Service>>(
    `${meta.profile.key}.capability.identityService`,
  );
  /** The HALO Space service instance, for imperative consumers. */
  export const SpaceService = Capability.makeSingleton<Context.Tag.Service<Space.Service>>(
    `${meta.profile.key}.capability.spaceService`,
  );
}
