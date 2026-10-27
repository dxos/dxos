//
// Copyright 2026 DXOS.org
//

import { create, isMessage } from '@bufbuild/protobuf';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

import { asyncTimeout } from '@dxos/async';
import {
  type ClientServices,
  type ClientServicesProvider,
  type ClientServicesRpc,
  type DeferredStreamInterceptor,
  makeDeferredClientServicesRpc,
  makeServicesFromRpc,
} from '@dxos/client-protocol';
import { type ExportWorkingSetOptions, type WorkingSetRow } from '@dxos/echo-client';
import { BaseError } from '@dxos/errors';
import { type PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { fromPublicKey } from '@dxos/protocols/buf';
import { SpaceState } from '@dxos/protocols/buf/dxos/client/invitation_pb';
import {
  QuerySpacesResponseSchema,
  Space_PipelineStateSchema,
  SpaceSchema,
} from '@dxos/protocols/buf/dxos/client/services_pb';
import { markMilestone } from '@dxos/util';

import { BootCacheStore, type BootSnapshot, type RecordedStreams } from './boot-cache-store.ts';

/** Streams the client waits on to open, whose last message stands for the whole state. */
const LATEST_STREAMS = [
  'SystemService.queryStatus',
  'IdentityService.queryIdentity',
  'DevicesService.queryDevices',
  'SpacesService.querySpaces',
];

/** Streams that deliver their state as a sequence (added, then load complete), replayed from the start. */
const INITIAL_STREAMS = ['InvitationsService.queryInvitations'];
const INITIAL_LIMIT = 64;

/** The wrapped services failed to open, so a call that waited for them cannot run. */
export class ServicesUnavailableError extends BaseError.extend(
  'ServicesUnavailableError',
  'The client services failed to open.',
) {}

export const DEFAULT_BOOT_CACHE_MAX_BYTES = 16 * 1024 * 1024;

/** How long opening waits for {@link BootCacheOptions.pendingSpaces} before it opens without them. */
const PENDING_SPACES_TIMEOUT = 5_000;

/**
 * A space this client has not joined yet, listed and opened from documents fetched elsewhere — a share link's, from
 * EDGE — until the services list it.
 */
export type PendingSpace = {
  spaceId: string;
  spaceKey: PublicKey;
  /** `automerge:<documentId>` of the space root, which {@link rows} holds. */
  spaceRootUrl: string;
  rows: WorkingSetRow[];
};

export type BootCacheOptions = {
  /** Upper bound on the working-set bytes persisted across every space. */
  maxBytes?: number;
  /**
   * Holds the services' open until it resolves, when the client opened from a snapshot, so an app can
   * start its worker once the page has what it needs; a client without a snapshot opens them at once.
   */
  servicesGate?: () => Promise<void>;
  /**
   * Spaces to list and open before this client has joined them, such as the one a share link is joining. Each stays
   * listed until the services list it, and its database opens from the rows given.
   */
  pendingSpaces?: () => Promise<PendingSpace[]>;
};

/** A space whose working set the boot cache persists. */
export type WorkingSetSource = {
  id: string;
  exportWorkingSet: (options: ExportWorkingSetOptions) => WorkingSetRow[];
};

const streamKey = (tag: string, payload: unknown): string =>
  `${tag}:${JSON.stringify(payload ?? null, (_, value) => (typeof value === 'bigint' ? value.toString() : value))}`;

/** What a set of rows holds, so an unchanged working set is not written again. */
const signatureOf = (rows: readonly WorkingSetRow[]): string =>
  rows.map((row) => `${row.documentId}@${row.heads.join(',')}`).join(';');

const cloneable = (value: unknown): boolean => {
  try {
    structuredClone(value);
    return true;
  } catch {
    return false;
  }
};

/**
 * Lets the client open before its services do. Wraps a {@link ClientServicesProvider}: with a snapshot
 * from an earlier session, {@link open} returns at once, the streams the client waits on replay what they
 * last delivered, every other call waits for the wrapped services, and each space opens from the
 * working set it last held. Once the services are reachable their streams take over, and the data
 * service brings each document current from the heads the snapshot held it at.
 */
export class BootCacheServices implements ClientServicesProvider {
  readonly #provider: ClientServicesProvider;
  readonly #store = new BootCacheStore();
  readonly #maxBytes: number;
  readonly #servicesGate?: () => Promise<void>;
  readonly #loadPendingSpaces?: () => Promise<PendingSpace[]>;
  /** Spaces listed from {@link BootCacheOptions.pendingSpaces} that the services have not listed yet, by space id. */
  readonly #pending = new Map<string, PendingSpace>();
  readonly #providerOpened = Promise.withResolvers<void>();
  /** Messages each recorded stream delivered this session, written with the next {@link persist}. */
  readonly #recorded = new Map<string, unknown[]>();
  /** The one subscription per key whose messages an initial-sequence stream records. */
  readonly #recorders = new Map<string, symbol>();
  /** What each space last wrote, so an unchanged working set is not written again. */
  readonly #written = new Map<string, string>();
  #snapshot?: BootSnapshot;
  #providerOpen = false;
  #persisting?: Promise<void>;
  #cleared = false;

  readonly rpc: ClientServicesRpc;
  readonly services: Partial<ClientServices>;

  constructor(
    provider: ClientServicesProvider,
    { maxBytes = DEFAULT_BOOT_CACHE_MAX_BYTES, servicesGate, pendingSpaces }: BootCacheOptions = {},
  ) {
    this.#provider = provider;
    this.#maxBytes = maxBytes;
    this.#servicesGate = servicesGate;
    this.#loadPendingSpaces = pendingSpaces;
    // Every deferred call receives the rejection too; this records it when no call is waiting.
    this.#providerOpened.promise.catch((error) => log.warn('client services failed to open', { error }));
    const resolve = Effect.tryPromise({
      try: () => this.#providerOpened.promise,
      catch: (cause) => new ServicesUnavailableError({ cause }),
    }).pipe(Effect.map(() => this.#provider.rpc));
    const interceptors: Record<string, DeferredStreamInterceptor> = {};
    for (const tag of LATEST_STREAMS) {
      interceptors[tag] = this.#intercept(tag, 'latest');
    }
    for (const tag of INITIAL_STREAMS) {
      interceptors[tag] = this.#intercept(tag, 'initial');
    }
    this.rpc = makeDeferredClientServicesRpc(resolve, interceptors);
    this.services = makeServicesFromRpc(this.rpc, Context.empty());
  }

  get closed() {
    return this.#provider.closed;
  }

  get reconnected() {
    return this.#provider.reconnected;
  }

  get hostStatus() {
    return this.#provider.hostStatus;
  }

  onReconnect = (callback: () => Promise<void>) => {
    this.#provider.onReconnect?.(callback);
  };

  /** Resolves once the wrapped services are open, which {@link open} can return ahead of. */
  whenServicesOpen(): Promise<void> {
    return this.#providerOpened.promise;
  }

  /** Whether this session opened from a snapshot rather than waiting for the services. */
  get bootedFromCache(): boolean {
    return this.#snapshot !== undefined;
  }

  /** Whether a space is listed only from {@link BootCacheOptions.pendingSpaces}, which the services do not list yet. */
  isPending(spaceId: string): boolean {
    return this.#pending.has(spaceId);
  }

  async open(): Promise<void> {
    // Fetched while the store is read and the services open, which is what it is waited for alongside.
    const pending =
      this.#loadPendingSpaces && !this.#providerOpen ? this.#readPendingSpaces(this.#loadPendingSpaces) : undefined;
    const snapshot = this.#providerOpen
      ? undefined
      : await this.#store.read().catch((error) => {
          log.warn('boot cache unreadable, opening without it', { error });
          return undefined;
        });
    this.#snapshot = snapshot;
    // What the store already holds needs no rewrite until the working set moves on from it.
    for (const [spaceId, rows] of snapshot?.spaces ?? []) {
      this.#written.set(spaceId, signatureOf(rows));
    }
    const gate = snapshot && this.#servicesGate ? this.#servicesGate() : Promise.resolve();
    const opening = gate
      .then(() => {
        markMilestone('boot-cache.services-requested');
        return this.#provider.open();
      })
      .then(() => {
        this.#providerOpen = true;
        markMilestone('boot-cache.services-open');
      });
    opening.then(this.#providerOpened.resolve, this.#providerOpened.reject);
    for (const space of (await pending) ?? []) {
      this.#pending.set(space.spaceId, space);
    }
    if (snapshot) {
      markMilestone('boot-cache.opened-from-cache');
      log('opened from boot cache', { spaces: snapshot.spaces.size });
      return;
    }
    await opening;
  }

  async close(): Promise<void> {
    await this.#persisting;
    this.#store.close();
    await this.#provider.close();
  }

  /** The working set a space last held, handed out once: a later open in this session starts from the services. */
  takeWorkingSet(spaceId: string): WorkingSetRow[] | undefined {
    const rows = this.#snapshot?.spaces.get(spaceId) ?? this.#pending.get(spaceId)?.rows;
    this.#snapshot?.spaces.delete(spaceId);
    return rows;
  }

  /**
   * Writes the recorded streams and each space's working set, within the byte budget in the order given;
   * a space whose documents are where they were at the last write is not written again.
   */
  persist(spaces: Iterable<WorkingSetSource>): Promise<void> {
    return this.#enqueue(() => this.#persist(spaces), 'boot cache not written');
  }

  /** Empties the store, after any write already queued; no later {@link persist} writes again. */
  clear(): Promise<void> {
    this.#cleared = true;
    return this.#enqueue(async () => {
      this.#written.clear();
      this.#recorded.clear();
      await this.#store.clear();
    }, 'boot cache not cleared');
  }

  /** One store operation at a time: one that overlapped an earlier one could land first and be overwritten by it. */
  #enqueue(operation: () => Promise<void>, failure: string): Promise<void> {
    const previous = this.#persisting ?? Promise.resolve();
    this.#persisting = previous.then(operation).catch((error) => log.warn(failure, { error }));
    return this.#persisting;
  }

  async #persist(spaces: Iterable<WorkingSetSource>): Promise<void> {
    // Before the services answer, nothing live has been recorded and spaces may not be open, so a write
    // would replace the snapshot with less than it holds.
    if (this.#cleared || !this.#providerOpen) {
      return;
    }
    const started = performance.now();
    let remaining = this.#maxBytes;
    const changed = new Map<string, WorkingSetRow[]>();
    const listed = new Set<string>();
    let rowCount = 0;
    for (const space of spaces) {
      // Not this client's to keep until it has joined; the services list it once it has.
      if (this.#pending.has(space.id)) {
        continue;
      }
      listed.add(space.id);
      const rows = space.exportWorkingSet({ maxBytes: remaining });
      if (rows.length === 0) {
        continue;
      }
      rowCount += rows.length;
      remaining -= rows.reduce((total, row) => total + row.bytes.length, 0);
      const signature = signatureOf(rows);
      if (this.#written.get(space.id) !== signature) {
        changed.set(space.id, rows);
        this.#written.set(space.id, signature);
      }
    }
    // A listed space that exported nothing is not open yet, which is no reason to drop what it last wrote.
    const remove = [...this.#written.keys()].filter((spaceId) => !listed.has(spaceId));
    remove.forEach((spaceId) => this.#written.delete(spaceId));
    const exported = performance.now();
    const streams: RecordedStreams = Object.fromEntries(this.#recorded);
    await this.#store.write({ streams, spaces: changed, remove });
    const written = {
      rows: rowCount,
      bytes: this.#maxBytes - remaining,
      spacesWritten: changed.size,
      exportMs: Math.round(exported - started),
      writeMs: Math.round(performance.now() - exported),
    };
    log('boot cache written', written);
    markMilestone('boot-cache.written', JSON.stringify(written));
  }

  async #readPendingSpaces(load: () => Promise<PendingSpace[]>): Promise<PendingSpace[]> {
    try {
      return await asyncTimeout(load(), PENDING_SPACES_TIMEOUT);
    } catch (error) {
      log.warn('pending spaces not read, opening without them', { error });
      return [];
    }
  }

  /**
   * Lists each pending space as a space ready to open from its rows, in place of what the services list for it. A space
   * the services list as ready stops being pending, so from then on the services alone decide how it is listed; until
   * then their earlier states (joining, initializing) would close the database the rows opened.
   */
  #withPendingSpaces(message: unknown, fromServices: boolean): unknown {
    if (this.#pending.size === 0 || !isMessage(message, QuerySpacesResponseSchema)) {
      return message;
    }
    if (fromServices) {
      message.spaces
        .filter(({ state }) => state === SpaceState.SPACE_READY)
        .forEach(({ id }) => this.#pending.delete(id));
    }
    if (this.#pending.size === 0) {
      return message;
    }
    const spaces = message.spaces.filter(({ id }) => !this.#pending.has(id));
    return create(QuerySpacesResponseSchema, {
      spaces: [...spaces, ...[...this.#pending.values()].map(serializePendingSpace)],
    });
  }

  #intercept(tag: string, policy: 'latest' | 'initial'): DeferredStreamInterceptor {
    return (payload, live) => {
      const key = streamKey(tag, payload);
      // Replayed only before the services answer: a stream opened after that reads them directly.
      const replay = this.#providerOpen ? undefined : this.#snapshot?.streams[key];
      const recorder = Symbol(key);
      if (policy === 'initial' && !this.#recorders.has(key)) {
        this.#recorders.set(key, recorder);
      }
      const recorded = live.pipe(
        Stream.tap((message) =>
          Effect.sync(() => {
            if (!cloneable(message)) {
              return;
            }
            if (policy === 'latest') {
              this.#recorded.set(key, [message]);
            } else if (this.#recorders.get(key) === recorder) {
              const messages = this.#recorded.get(key) ?? [];
              if (messages.length < INITIAL_LIMIT) {
                this.#recorded.set(key, [...messages, message]);
              }
            }
          }),
        ),
      );
      if (tag === QUERY_SPACES) {
        const replayed = Stream.fromIterable(replay ?? []).pipe(
          Stream.map((message) => this.#withPendingSpaces(message, false)),
        );
        return Stream.concat(replayed, recorded.pipe(Stream.map((message) => this.#withPendingSpaces(message, true))));
      }
      return replay?.length ? Stream.concat(Stream.fromIterable(replay), recorded) : recorded;
    };
  }
}

const QUERY_SPACES = 'SpacesService.querySpaces';

/** A pending space as the services would list a ready one, with only what opening its database needs. */
const serializePendingSpace = ({ spaceId, spaceKey, spaceRootUrl }: PendingSpace) =>
  create(SpaceSchema, {
    id: spaceId,
    spaceKey: fromPublicKey(spaceKey),
    state: SpaceState.SPACE_READY,
    pipeline: create(Space_PipelineStateSchema, { directoryUrl: spaceRootUrl }),
  });
