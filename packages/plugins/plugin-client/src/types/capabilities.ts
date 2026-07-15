//
// Copyright 2025 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';
import { type Context } from 'effect';

import { Capability } from '@dxos/app-framework';
import { type Client } from '@dxos/client';
import { type ObjectMigration } from '@dxos/client/echo';
import { type Type } from '@dxos/echo';
import { type HubHttpClient } from '@dxos/edge-client';
import { type Identity, type Space } from '@dxos/halo';

import { meta } from '#meta';

import { type AccountCache as AccountCacheType } from './account-cache';

export namespace ClientCapabilities {
  export const Client = Capability.make<Client>(`${meta.profile.key}.capability.client`);
  export const Schema = Capability.make<Type.AnyEntity[]>(`${meta.profile.key}.capability.schema`);
  export const Migration = Capability.make<ObjectMigration[]>(`${meta.profile.key}.capability.migration`);
  export const AccountCache = Capability.make<Atom.Writable<AccountCacheType>>(
    `${meta.profile.key}.capability.accountCache`,
  );
  export const HubHttpClient = Capability.make<HubHttpClient>(`${meta.profile.key}.capability.hubHttpClient`);

  /**
   * The HALO Identity service instance, for imperative (non-React, non-Effect-layer) consumers
   * that need identity access without depending on `@dxos/client`.
   */
  export const HaloIdentity: Capability.InterfaceDef<Context.Tag.Service<Identity.Service>> = Capability.make(
    `${meta.profile.key}.capability.haloIdentity`,
  );
  /** The HALO Space service instance, for imperative consumers. */
  export const HaloSpace: Capability.InterfaceDef<Context.Tag.Service<Space.Service>> = Capability.make(
    `${meta.profile.key}.capability.haloSpace`,
  );
}
