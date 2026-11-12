//
// Copyright 2026 DXOS.org
//

import { create } from '@bufbuild/protobuf';
import * as Effect from 'effect/Effect';

import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Trigger } from '@dxos/async';
import { Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { TestBuilder, performInvitation } from '@dxos/client/testing';
import { type SpaceId } from '@dxos/keys';
import { ProfileDocumentSchema } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { ConnectionState } from '@dxos/react-client/mesh';

import { type Demo } from './Demo.ts';

export type Peer = { readonly name: string; readonly hue: string };

export const PEERS: readonly [Peer, Peer] = [
  { name: 'Alice', hue: 'cyan' },
  { name: 'Bob', hue: 'amber' },
];

/** Resolves once `client` lists the space, which an accepted invitation adds a moment later. */
export const listed = (client: Client, spaceId: SpaceId): Promise<Space> =>
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

export type RuntimeState = {
  readonly spaceId?: SpaceId;
  /** The id of each object a demo seeded, by demo id and subject key; every peer resolves it in its own replica. */
  readonly subjects?: Record<string, Record<string, string>>;
  /** Which peers have the space ready in their own client. */
  readonly joined: readonly boolean[];
  readonly online: readonly boolean[];
  readonly error?: string;
};

export type DemoRuntimeOptions = {
  readonly title: string;
  /** Content more than one demo shows, seeded once before the demos' own. */
  readonly shared: readonly SampleSpace.Partial<unknown>[];
  readonly demos: readonly Demo[];
  /** Demos seeded once the second peer has joined, whose space opens more slowly the more content it holds. */
  readonly late?: readonly Demo[];
};

/**
 * The page's two in-memory peers and the one space every demo shows: the first peer creates the space and seeds
 * it while the second joins by invitation. Both start when the runtime is made, so the demos are ready by the time
 * they are seen.
 */
export class DemoRuntime {
  readonly clients: Client[];
  readonly #definition;
  readonly #host = new Trigger<Space>();
  readonly #guest = new Trigger();
  readonly #listeners = new Set<() => void>();
  #state: RuntimeState = { joined: PEERS.map(() => false), online: PEERS.map(() => true) };

  constructor({ title, shared, demos, late = [] }: DemoRuntimeOptions) {
    const builder = new TestBuilder();
    this.clients = PEERS.map(() => new Client({ services: builder.createLocalClientServices() }));
    this.#definition = SampleSpace.make({
      space: { name: title },
      partials: {
        ...Object.fromEntries(shared.map((partial) => [partial.name, partial])),
        ...Object.fromEntries([...demos, ...late].map((demo) => [demo.id, demo.partial])),
      },
      // Runs the partials themselves rather than the untyped runners, to keep each demo's subjects typed. Each demo
      // shows as soon as its own content is in, without waiting for the rest or the flush.
      build: () =>
        Effect.gen({ self: this }, function* () {
          for (const partial of shared) {
            yield* partial.run();
          }
          const seed = (demo: Demo) =>
            demo.partial.run().pipe(
              Effect.map((seeded) =>
                Object.fromEntries(Object.entries(seeded).map(([key, object]) => [key, object.id])),
              ),
              Effect.tap((ids) =>
                Effect.sync(() => this.#update({ subjects: { ...this.#state.subjects, [demo.id]: ids } })),
              ),
            );
          for (const demo of demos) {
            yield* seed(demo);
          }
          yield* Effect.promise(() => this.#guest.wait());
          for (const demo of late) {
            yield* seed(demo);
          }
        }),
    });
    this.clients.forEach((_, index) =>
      Effect.runFork(
        this.#join(index).pipe(
          Effect.catchCause((cause) =>
            Effect.sync(() => this.#update({ error: `${PEERS[index].name}: ${String(cause)}` })),
          ),
        ),
      ),
    );
  }

  getState = (): RuntimeState => this.#state;

  subscribe = (listener: () => void) => {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  };

  /** Connects or disconnects a peer in every demo at once, since they all show the same peer. */
  setOnline(index: number, online: boolean) {
    this.#update({ online: this.#state.online.map((current, i) => (i === index ? online : current)) });
    void this.clients[index].mesh.updateConfig(online ? ConnectionState.ONLINE : ConnectionState.OFFLINE);
  }

  /** Gives peer `index` its identity and puts it in the space. */
  #join(index: number) {
    const runtime = this;
    const client = this.clients[index];
    const peer = PEERS[index];
    return Effect.gen(function* () {
      yield* Effect.promise(() => client.initialize());
      yield* Effect.promise(() =>
        client.halo.createIdentity(create(ProfileDocumentSchema, { displayName: peer.name, data: { hue: peer.hue } })),
      );
      yield* Effect.promise(() => client.addTypes([...runtime.#definition.schemas]));
      yield* AppSpace.setupIdentitySpaces(client);

      // The second peer joins while the first seeds, and receives the content as it is written.
      if (index === 0) {
        const space = yield* Effect.promise(() => client.spaces.create({ name: runtime.#definition.space.name }));
        yield* Effect.promise(() => space.waitUntilReady());
        runtime.#update({ spaceId: space.id });
        runtime.#joined(index);
        runtime.#host.wake(space);
        yield* SampleSpace.applyTo(runtime.#definition, space);
      } else {
        const host = yield* Effect.promise(() => runtime.#host.wait());
        yield* Effect.promise(() => Promise.all(performInvitation({ host, guest: client.spaces })));
        const space = yield* Effect.promise(() => listed(client, host.id));
        yield* Effect.promise(() => space.waitUntilReady());
        runtime.#joined(index);
        runtime.#guest.wake();
      }
    });
  }

  #joined(index: number) {
    this.#update({ joined: this.#state.joined.map((joined, i) => joined || i === index) });
  }

  #update(state: Partial<RuntimeState>) {
    this.#state = { ...this.#state, ...state };
    this.#listeners.forEach((listener) => listener());
  }
}
