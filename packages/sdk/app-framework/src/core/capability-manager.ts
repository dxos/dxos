//
// Copyright 2025 DXOS.org
//

import { Atom, type Registry } from '@effect-atom/atom-react';
import * as Deferred from 'effect/Deferred';
import * as Effect from 'effect/Effect';

import { log } from '@dxos/log';

import type * as Capability from './capability';
import { CapabilityNotFoundError } from './errors';

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
  waitFor<T>(interfaceDef: Capability.InterfaceDef<T>): Effect.Effect<T>;

  /**
   * Get capabilities grouped by the module that contributed them.
   * @returns An atom containing a record from module ID to capability implementations.
   */
  atomByModule<T>(interfaceDef: Capability.InterfaceDef<T>): Atom.Atom<Record<string, T[]>>;

  /**
   * Live view over all contributions for a capability interface.
   * Stable per interface: repeated calls return the same object.
   */
  contributions<T>(interfaceDef: Capability.InterfaceDef<T>): Capability.Contributions<T>;

  /**
   * Lists capability interface identifiers that currently have at least one contribution.
   */
  listRegisteredIdentifiers(): string[];
}

/**
 * Internal implementation of CapabilityManager.
 */
class CapabilityManagerImpl implements CapabilityManager {
  private readonly _registry: Registry.Registry;

  private readonly _registeredIdentifiers = new Set<string>();

  private readonly _contributionsViews = new Map<string, Capability.Contributions<unknown>>();

  private readonly _capabilityEntries = Atom.family<string, Atom.Writable<CapabilityEntry<unknown>[]>>(() => {
    return Atom.make<CapabilityEntry<unknown>[]>([]).pipe(Atom.keepAlive);
  });

  readonly _capabilities = Atom.family<string, Atom.Atom<unknown[]>>((id: string) => {
    return Atom.make((get) => {
      const current = get(this._capabilityEntries(id));
      return current.map((c) => c.implementation);
    }).pipe(Atom.keepAlive);
  });

  readonly _capabilitiesByModule = Atom.family<string, Atom.Atom<Record<string, unknown[]>>>((id: string) => {
    return Atom.make((get) => {
      const entries = get(this._capabilityEntries(id));
      const result: Record<string, unknown[]> = {};
      for (const entry of entries) {
        (result[entry.moduleId] ??= []).push(entry.implementation);
      }
      return result;
    }).pipe(Atom.keepAlive);
  });

  readonly _capability = Atom.family<string, Atom.Atom<unknown>>((id: string) => {
    return Atom.make((get) => {
      const current = get(this._capabilities(id));
      if (current.length === 0) {
        throw new CapabilityNotFoundError({ identifier: id, registered: this.listRegisteredIdentifiers() });
      }
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
    this._registeredIdentifiers.add(interfaceDef.identifier);
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
      if (next.length === 0) {
        this._registeredIdentifiers.delete(interfaceDef.identifier);
      }
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
    if (capabilities.length === 0) {
      log('capability not available', {
        requested: interfaceDef.identifier,
        registered: this.listRegisteredIdentifiers(),
      });
      throw new CapabilityNotFoundError({
        identifier: interfaceDef.identifier,
        registered: this.listRegisteredIdentifiers(),
      });
    }
    return capabilities[0];
  }

  listRegisteredIdentifiers(): string[] {
    return [...this._registeredIdentifiers].sort();
  }

  waitFor<T>(interfaceDef: Capability.InterfaceDef<T>): Effect.Effect<T> {
    return Effect.gen(this, function* () {
      const [capability] = this.getAll(interfaceDef);
      if (capability) {
        return capability;
      }

      const deferred = yield* Deferred.make<T>();
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

  atomByModule<T>(interfaceDef: Capability.InterfaceDef<T>): Atom.Atom<Record<string, T[]>> {
    return this._capabilitiesByModule(interfaceDef.identifier) as Atom.Atom<Record<string, T[]>>;
  }

  contributions<T>(interfaceDef: Capability.InterfaceDef<T>): Capability.Contributions<T> {
    const existing = this._contributionsViews.get(interfaceDef.identifier);
    if (existing) {
      // NOTE: The type-checking for capabilities is done at the time of contribution.
      return existing as Capability.Contributions<T>;
    }

    const atom = this._capabilities(interfaceDef.identifier);
    const view: Capability.Contributions<unknown> = {
      atom,
      get: () => this._registry.get(atom),
      subscribe: (cb) => this._registry.subscribe(atom, cb),
    };
    this._contributionsViews.set(interfaceDef.identifier, view);
    return view as Capability.Contributions<T>;
  }
}

/**
 * Creates a new Capability Manager instance.
 */
export const make = (options: CapabilityManagerOptions): CapabilityManager => new CapabilityManagerImpl(options);
