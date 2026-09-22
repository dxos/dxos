//
// Copyright 2026 DXOS.org
//

import type * as EffectContext from 'effect/Context';
import * as Effect from 'effect/Effect';

import { DeferredTask } from '@dxos/async';
import { type Context } from '@dxos/context';
import { Entity, type Registry } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { log } from '@dxos/log';
import { type QueryService } from '@dxos/protocols/rpc';

export type RegistryPublisherParams = {
  registry: Registry.Registry;
  service: QueryService.Client;
  runtime: EffectContext.Context<never>;
  /**
   * Identifies this client's contribution to the host's union of registries. Owned by the client
   * rather than minted here, so a client that closes and reopens against the same host resumes
   * under the id its previous snapshot was filed under — and replaces that contribution rather
   * than stranding it beside a second one.
   */
  clientId: string;
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
  readonly #runtime: EffectContext.Context<never>;
  /** Replaced on reconnection; a captured client would address a host that is no longer serving. */
  #service: QueryService.Client;
  readonly #clientId: string;

  #publish!: DeferredTask;

  constructor(params: RegistryPublisherParams) {
    this.#registry = params.registry;
    this.#service = params.service;
    this.#runtime = params.runtime;
    this.#clientId = params.clientId;
  }

  /** Publishes the current registry and keeps publishing as it changes, until `ctx` is disposed. */
  open(ctx: Context): void {
    // A background push only logs a failure: it is driven by a registry change no caller is
    // waiting on, and letting it reject would surface as an unhandled rejection in the task.
    // A push still in flight when the client tears down is interrupted rather than failed, and
    // reporting that as a warning would put a stack in every closing client's output.
    this.#publish = new DeferredTask(ctx, () =>
      this.#push().catch((err) => {
        if (!ctx.disposed) {
          log.warn('Failed to publish registry', { err });
        }
      }),
    );
    this.#registry.changed.on(ctx, () => this.#publish.schedule());
    this.#publish.schedule();
  }

  /**
   * Point the publisher at a reconnected service and re-publish, since the new host has never seen
   * this client's registry. Keeps the client id, so the host recognises the snapshot as replacing
   * this client's previous contribution rather than adding a second one.
   */
  setService(service: QueryService.Client): void {
    this.#service = service;
    this.#publish.schedule();
  }

  /**
   * Publishes now and resolves once the host has indexed the snapshot.
   *
   * Rejects if the push fails: a caller that awaits this and then queries would otherwise read
   * under a completion guarantee the host never gave.
   */
  async flush(): Promise<void> {
    await this.#push();
  }

  /**
   * Withdraws this client's claim on its registry entries, so it no longer counts as an owner for
   * the rest of the host's session. The rows stay: they are a cache the next session re-adopts.
   *
   * Resolves once the host has recorded the withdrawal, not once it has re-indexed what the
   * withdrawal freed — this runs inside the client's teardown, which must not block on the host's
   * indexer.
   */
  async release(): Promise<void> {
    await this.#send([], { releasing: true });
  }

  async #push(): Promise<void> {
    await this.#send(this.#collect());
  }

  /** The registry as indexable entries, skipping anything that cannot be serialized. */
  #collect(): QueryService.RegistryEntry[] {
    const entries: QueryService.RegistryEntry[] = [];
    for (const entity of this.#registry.list()) {
      // Serialization reads the entity's own metadata, which a malformed entry can fail on. Such
      // an entity is not indexable, but it is still usable in-process — dropping it from the
      // snapshot is strictly better than failing the whole push.
      try {
        entries.push({ objectJson: JSON.stringify(Entity.toJSON(entity)) });
      } catch (err) {
        log.warn('Failed to prepare registry entity for indexing', { err });
      }
    }
    return entries;
  }

  #send(entries: readonly QueryService.RegistryEntry[], opts?: { releasing?: boolean }): Promise<void> {
    return EffectEx.runPromise(
      Effect.provideContext(
        this.#service['QueryService.updateRegistry']({
          clientId: this.#clientId,
          entries: [...entries],
          ...(opts?.releasing ? { releasing: true } : {}),
        }),
        this.#runtime,
      ),
    );
  }
}
