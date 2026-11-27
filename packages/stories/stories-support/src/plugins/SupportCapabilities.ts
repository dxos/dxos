//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Capability from '@dxos/app-framework/Capability';
import { type Database } from '@dxos/echo';

import { Contract } from '../contracts/index.ts';

/** What the pipeline's host gives a processor: the space it works in. */
export type Host = {
  readonly db: Database.Database;
};

/** A processor offered under a contract, with its implementation's type erased. */
export interface AnyProvider {
  readonly contract: Contract.Any;
  readonly provide: (host: Host) => object;
}

/** A processor offered under contract `C`. */
export interface Provider<C extends Contract.Any> extends AnyProvider {
  readonly contract: C;
  readonly provide: (host: Host) => Contract.Implementation<C>;
}

/**
 * Plugins contribute the processors the support pipeline runs. A multi capability today; each entry is keyed by a
 * contract so it can move to the plugin services registry without changing its interface.
 */
export const Processor = Capability.make<AnyProvider>()('org.dxos.stories.support.capability.processor');

/** Whether a provider offers `contract` at a version the consumer can use. */
export const provides =
  <C extends Contract.Any>(contract: C) =>
  (provider: AnyProvider): provider is Provider<C> =>
    provider.contract.key === contract.key && Contract.satisfies(provider.contract.version, contract.version);

/** The first provider of `contract` among those contributed. */
export const resolve = <C extends Contract.Any>(
  providers: readonly AnyProvider[],
  contract: C,
): Provider<C> | undefined => providers.find(provides(contract));
