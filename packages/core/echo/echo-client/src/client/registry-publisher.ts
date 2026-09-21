//
// Copyright 2026 DXOS.org
//

import type * as EffectContext from 'effect/Context';
import * as Effect from 'effect/Effect';

import { DeferredTask } from '@dxos/async';
import { type Context } from '@dxos/context';
import { Entity, type Registry, Type } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { DXN, EID, EntityId, PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { type QueryService } from '@dxos/protocols/rpc';

/**
 * The key an entity is indexed under on the host.
 *
 * Mirrors how {@link Registry.Registry} addresses an entity, collapsed to the single canonical form
 * the index keys rows by: a type entity by its `dxn:<typename>:<version>`, a keyed entity by its
 * `dxn:<nsid>[:<version>]`, and anything else by its identifier EID. The version is part of the
 * key, so two versions of one entity are two index entries and a re-registration of one version
 * replaces just that entry.
 */
export const registryEntryKey = (entity: Entity.Unknown): string | undefined => {
  if (Type.isType(entity)) {
    const typename = Type.getTypename(entity);
    const version = Type.getVersion(entity);
    if (typename == null || version == null) {
      return undefined;
    }
    return DXN.tryMake(`dxn:${typename}:${version}`) ?? undefined;
  }

  const meta = Entity.getMeta(entity);
  const key = meta?.key;
  if (key != null) {
    const nsid = DXN.isDXN(key) ? key.slice('dxn:'.length) : key;
    return meta?.version != null
      ? (DXN.tryMake(`dxn:${nsid}:${meta.version}`) ?? undefined)
      : (DXN.tryMake(`dxn:${nsid}`) ?? undefined);
  }

  const id = (entity as { id?: unknown }).id;
  return typeof id === 'string' ? EID.make({ entityId: EntityId.make(id) }) : undefined;
};

export type RegistryPublisherParams = {
  registry: Registry.Registry;
  service: QueryService.Client;
  runtime: EffectContext.Context<never>;
};

/**
 * Mirrors the client's in-process registry to the host so the indexer can see it.
 *
 * The registry lives here and the index lives in the worker, so nothing on the host can observe a
 * registration — it has to be pushed. Each push is the whole registry rather than a delta: it is
 * small, it is rebuilt from code on every start, and a snapshot is what lets the host recognise an
 * entity that left as well as one that arrived. Pushes are coalesced through a `DeferredTask`,
 * since registering a plugin's types adds them one batch at a time.
 */
export class RegistryPublisher {
  readonly #registry: Registry.Registry;
  readonly #service: QueryService.Client;
  readonly #runtime: EffectContext.Context<never>;
  /** Identifies this client's contribution to the host's union of registries. */
  readonly #clientId = PublicKey.random().toHex();

  #publish!: DeferredTask;

  constructor(params: RegistryPublisherParams) {
    this.#registry = params.registry;
    this.#service = params.service;
    this.#runtime = params.runtime;
  }

  /** Publishes the current registry and keeps publishing as it changes, until `ctx` is disposed. */
  open(ctx: Context): void {
    this.#publish = new DeferredTask(ctx, () => this.#push());
    this.#registry.changed.on(ctx, () => this.#publish.schedule());
    this.#publish.schedule();
  }

  /** Publishes now and resolves once the host has indexed the snapshot. */
  async flush(): Promise<void> {
    await this.#publish.runBlocking();
  }

  async #push(): Promise<void> {
    const entries: QueryService.RegistryEntry[] = [];
    for (const entity of this.#registry.list()) {
      // Keying and serialization both read the entity's own metadata, which a malformed entry can
      // fail on. Such an entity is not indexable, but it is still usable in-process — dropping it
      // from the snapshot is strictly better than failing the whole push.
      try {
        const key = registryEntryKey(entity);
        if (key === undefined) {
          continue;
        }
        entries.push({ key, objectJson: JSON.stringify(Entity.toJSON(entity)) });
      } catch (err) {
        log.warn('Failed to prepare registry entity for indexing', { err });
      }
    }

    try {
      await EffectEx.runPromise(
        Effect.provideContext(
          this.#service['QueryService.updateRegistry']({ clientId: this.#clientId, entries }),
          this.#runtime,
        ),
      );
    } catch (err) {
      log.warn('Failed to publish registry to host', { entries: entries.length, err });
    }
  }
}
