//
// Copyright 2025 DXOS.org
//

import { Atom, type Registry } from '@effect-atom/atom-react';
import * as Deferred from 'effect/Deferred';
import * as Effect from 'effect/Effect';

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import type * as Capability from './capability';

type CapabilityEntry<T> = {
  moduleId: string;
  implementation: T;
};

/**
 * Options for creating a capability manager.
 * @internal
 */
export type CapabilityManagerOptions = {
  registry: Registry.Registry;
};

/**
 * Interface for the Capability Manager.
 * Provides methods for contributing, removing, and accessing capabilities.
 */
export interface CapabilityManager {
  contribute<T>(args: { module: string; interface: Capability.InterfaceDef<T>; implementation: T }): void;

  remove<T>(interfaceDef: Capability.InterfaceDef<T>, implementation: T): void;

  /**
   * Get the Atom reference to the available capabilities for a given interface.
   * Primarily useful for deriving other Atom values based on the capabilities or
   * for subscribing to changes in the capabilities.
   * @returns An atom reference to the available capabilities.
   */
  atom<T>(interfaceDef: Capability.InterfaceDef<T>): Atom.Atom<T[]>;

  /**
   * Get capabilities from the capability manager.
   * @returns An array of capabilities.
   */
  getAll<T>(interfaceDef: Capability.InterfaceDef<T>): T[];

  /**
   * Requests a single capability from the capability manager.
   * @returns The capability.
   * @throws If no capability is found.
   */
  get<T>(interfaceDef: Capability.InterfaceDef<T>): T;

  /**
   * Waits for a capability to be available.
   * @returns The capability.
   */
  waitFor<T>(interfaceDef: Capability.InterfaceDef<T>): Effect.Effect<T, Error>;
}

/**
 * Internal implementation of CapabilityManager.
 */
class CapabilityManagerImpl implements CapabilityManager {
  private readonly _registry: Registry.Registry;

  private readonly _capabilityEntries = Atom.family<string, Atom.Writable<CapabilityEntry<unknown>[]>>(() => {
    return Atom.make<CapabilityEntry<unknown>[]>([]).pipe(Atom.keepAlive);
  });

  readonly _capabilities = Atom.family<string, Atom.Atom<unknown[]>>((id: string) => {
    return Atom.make((get) => {
      const current = get(this._capabilityEntries(id));
      return current.map((c) => c.implementation);
    });
  });

  readonly _capability = Atom.family<string, Atom.Atom<unknown>>((id: string) => {
    return Atom.make((get) => {
      const current = get(this._capabilities(id));
      invariant(current.length > 0, `No capability found for ${id}`);
      return current[0];
    });
  });

  constructor({ registry }: CapabilityManagerOptions) {
    this._registry = registry;
  }

  contribute<T>({
    module: moduleId,
    interface: interfaceDef,
    implementation,
  }: {
    module: string;
    interface: Capability.InterfaceDef<T>;
    implementation: T;
  }): void {
    const current = this._registry.get(this._capabilityEntries(interfaceDef.identifier));
    const isDuplicate = current.some((c) => c.moduleId === moduleId && c.implementation === implementation);
    if (isDuplicate) {
      log('capability already contributed, skipping', { id: interfaceDef.identifier, moduleId });
      return;
    }

    const entry: CapabilityEntry<T> = { moduleId, implementation };
    this._registry.set(this._capabilityEntries(interfaceDef.identifier), [...current, entry]);
    log('capability contributed', {
      id: interfaceDef.identifier,
      moduleId,
      count: current.length,
    });
  }

  remove<T>(interfaceDef: Capability.InterfaceDef<T>, implementation: T): void {
    const current = this._registry.get(this._capabilityEntries(interfaceDef.identifier));
    if (current.length === 0) {
      return;
    }

    const next = current.filter((c) => c.implementation !== implementation);
    if (next.length !== current.length) {
      this._registry.set(this._capabilityEntries(interfaceDef.identifier), next);
      log('capability removed', { id: interfaceDef.identifier, count: current.length });
    } else {
      log.warn('capability not removed', { id: interfaceDef.identifier });
    }
  }

  atom<T>(interfaceDef: Capability.InterfaceDef<T>): Atom.Atom<T[]> {
    // NOTE: This the type-checking for capabilities is done at the time of contribution.
    return this._capabilities(interfaceDef.identifier) as Atom.Atom<T[]>;
  }

  getAll<T>(interfaceDef: Capability.InterfaceDef<T>): T[] {
    return this._registry.get(this.atom(interfaceDef));
  }

  get<T>(interfaceDef: Capability.InterfaceDef<T>): T {
    const capabilities = this.getAll(interfaceDef);
    invariant(capabilities.length > 0, `No capability found for ${interfaceDef.identifier}`);
    return capabilities[0];
  }

  waitFor<T>(interfaceDef: Capability.InterfaceDef<T>): Effect.Effect<T, Error> {
    return Effect.gen(this, function* () {
      const [capability] = this.getAll(interfaceDef);
      if (capability) {
        return capability;
      }

      const deferred = yield* Deferred.make<T, Error>();
      const cancel = this._registry.subscribe(this.atom(interfaceDef), (capabilities) => {
        if (capabilities.length > 0) {
          Effect.runSync(Deferred.succeed(deferred, capabilities[0]));
        }
      });
      const result = yield* Deferred.await(deferred);
      cancel();
      return result;
    });
  }
}

/**
 * Creates a new Capability Manager instance.
 */
export const make = (options: CapabilityManagerOptions): CapabilityManager => new CapabilityManagerImpl(options);
