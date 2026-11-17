//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { create } from '@bufbuild/protobuf';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import { type PropsWithChildren, createContext, createElement, useContext } from 'react';

import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Trigger } from '@dxos/async';
import { Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { TestBuilder, performInvitation } from '@dxos/client/testing';
import { Database, type Type } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import { type SpaceId } from '@dxos/keys';
import { ProfileDocumentSchema } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { ConnectionState } from '@dxos/react-client/mesh';

export type Peer = { readonly name: string; readonly hue: string };

export const PEERS: readonly Peer[] = [
  { name: 'Alice', hue: 'cyan' },
  { name: 'Bob', hue: 'amber' },
];

export type State = {
  readonly spaceId?: SpaceId;
  /** Which peers have the space ready in their own client. */
  readonly joined: readonly boolean[];
  readonly online: readonly boolean[];
  readonly error?: string;
};

export type Options = {
  /** The shared space's name. */
  readonly title: string;
  /** How many peers, from {@link PEERS}; two unless given. */
  readonly count?: number;
};

export type SeedOptions = {
  /** Wait until every peer has joined: a space holding more content opens more slowly for the peers that join it. */
  readonly late?: boolean;
};

/**
 * In-memory peers sharing one space: the first creates it and the rest join by invitation. Every story that runs on a
 * runtime seeds into that space, so a page of stories can share one runtime instead of starting clients for each.
 */
export class Runtime {
  readonly peers: readonly Peer[];
  readonly clients: readonly Client[];
  readonly #host = new Trigger<Space>();
  readonly #joined = new Trigger();
  readonly #spaces: Trigger<Space>[];
  readonly #seeds = new Map<string, Promise<unknown>>();
  readonly #listeners = new Set<() => void>();
  #state: State;

  constructor({ title, count = 2 }: Options) {
    this.peers = PEERS.slice(0, count);
    const builder = new TestBuilder();
    this.clients = this.peers.map(() => new Client({ services: builder.createLocalClientServices() }));
    this.#spaces = this.peers.map(() => new Trigger<Space>());
    this.#state = { joined: this.peers.map(() => false), online: this.peers.map(() => true) };
    this.peers.forEach((_, index) =>
      Effect.runFork(
        this.#join(index, title).pipe(
          Effect.catchCause((cause) =>
            Effect.sync(() => this.#update({ error: `${this.peers[index].name}: ${String(cause)}` })),
          ),
        ),
      ),
    );
  }

  getState = (): State => this.#state;

  subscribe = (listener: () => void) => {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  };

  /** Resolves once peer `index` has the shared space ready. */
  space(index: number): Promise<Space> {
    return this.#spaces[index].wait();
  }

  /** Takes a peer's network offline or brings it back. */
  setOnline(index: number, online: boolean) {
    this.#update({ online: this.#state.online.map((current, i) => (i === index ? online : current)) });
    void this.clients[index].mesh.updateConfig(online ? ConnectionState.ONLINE : ConnectionState.OFFLINE);
  }

  /** Registers types on every peer, so a replica can read what another peer writes. */
  async addTypes(types: readonly Type.AnyEntity[]) {
    if (types.length > 0) {
      await Promise.all(this.clients.map((client) => client.addTypes([...types])));
    }
  }

  /** Runs `seed` once per key on the first peer, in the shared space. */
  seed<A>(key: string, seed: (props: { client: Client; space: Space }) => Promise<A>, options: SeedOptions = {}) {
    let result = this.#seeds.get(key);
    if (!result) {
      result = (async () => {
        const space = await this.#host.wait();
        if (options.late) {
          await this.#joined.wait();
        }
        return seed({ client: this.clients[0], space });
      })();
      this.#seeds.set(key, result);
    }

    // Callers share a key only for the same seed, so the stored promise is this seed's, which the map cannot type.
    return result as Promise<A>;
  }

  /** Runs a sample-space partial once in the shared space, after registering its types on every peer. */
  run<A>(partial: SampleSpace.Partial<A>, options?: SeedOptions): Promise<A> {
    return this.seed(
      `partial:${partial.name}`,
      async ({ space }) => {
        await this.addTypes(partial.schemas);
        return runPartial(partial, space);
      },
      options,
    );
  }

  #join(index: number, title: string) {
    const runtime = this;
    const client = this.clients[index];
    const peer = this.peers[index];
    return Effect.gen(function* () {
      yield* Effect.promise(() => client.initialize());
      yield* Effect.promise(() =>
        client.halo.createIdentity(create(ProfileDocumentSchema, { displayName: peer.name, data: { hue: peer.hue } })),
      );
      yield* AppSpace.setupIdentitySpaces(client);

      // The other peers join while the first seeds, and receive the content as it is written.
      if (index === 0) {
        const space = yield* Effect.promise(() => client.spaces.create({ name: title }));
        yield* Effect.promise(() => space.waitUntilReady());
        runtime.#update({ spaceId: space.id });
        runtime.#ready(index, space);
        runtime.#host.wake(space);
      } else {
        const host = yield* Effect.promise(() => runtime.#host.wait());
        yield* Effect.promise(() => Promise.all(performInvitation({ host, guest: client.spaces })));
        const space = yield* Effect.promise(() => listed(client, host.id));
        yield* Effect.promise(() => space.waitUntilReady());
        runtime.#ready(index, space);
      }
    });
  }

  #ready(index: number, space: Space) {
    this.#spaces[index].wake(space);
    const joined = this.#state.joined.map((joined, i) => joined || i === index);
    this.#update({ joined });
    if (joined.every(Boolean)) {
      this.#joined.wake();
    }
  }

  #update(state: Partial<State>) {
    this.#state = { ...this.#state, ...state };
    this.#listeners.forEach((listener) => listener());
  }
}

export const make = (options: Options): Runtime => new Runtime(options);

/**
 * Runs a partial against a space without the final flush `SampleSpace.applyTo` waits for, so its objects show as soon
 * as they are written.
 */
export const runPartial = <A>(partial: SampleSpace.Partial<A>, space: Space): Promise<A> =>
  EffectEx.runPromise(
    partial
      .run()
      .pipe(
        Effect.provideService(Database.Origin, 'system'),
        Effect.provide(
          Layer.provideMerge(
            SampleSpace.layer({ properties: space.properties, reference: new Date() }),
            Database.layer(space.db),
          ),
        ),
      ),
  );

/** Resolves once `client` lists the space, which an accepted invitation adds a moment later. */
const listed = (client: Client, spaceId: SpaceId): Promise<Space> =>
  new Promise((resolve) => {
    const space = client.spaces.get(spaceId);
    if (space) {
      resolve(space);
      return;
    }
    const subscription = client.spaces.subscribe(() => {
      const space = client.spaces.get(spaceId);
      if (space) {
        subscription.unsubscribe();
        resolve(space);
      }
    });
  });

export type Shared = {
  readonly runtime: Runtime;
  /** Seed this story only after every peer has joined. */
  readonly late?: boolean;
};

const SharedContext = createContext<Shared | undefined>(undefined);

export type ProviderProps = PropsWithChildren<Shared>;

/** Runs the stories inside on `runtime` rather than on clients of their own: the escape hatch for a page of stories. */
export const Provider = ({ runtime, late, children }: ProviderProps) =>
  createElement(SharedContext.Provider, { value: { runtime, late } }, children);

export const useShared = (): Shared | undefined => useContext(SharedContext);
