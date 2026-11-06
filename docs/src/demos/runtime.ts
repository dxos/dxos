//
// Copyright 2026 DXOS.org
//

import { create } from '@bufbuild/protobuf';
import * as Effect from 'effect/Effect';

import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import * as SampleSpace from '@dxos/app-toolkit/SampleSpace';
import { Trigger } from '@dxos/async';
import { type Client, type ClientServicesProvider } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { TestBuilder, performInvitation } from '@dxos/client/testing';
import { type SpaceId } from '@dxos/keys';
import { ProfileDocumentSchema } from '@dxos/protocols/buf/dxos/halo/credentials_pb';

import { type Demo } from './Demo.ts';

export type Peer = { readonly name: string; readonly hue: string };

export const PEERS: readonly [Peer, Peer] = [
  { name: 'Alice', hue: 'cyan' },
  { name: 'Bob', hue: 'amber' },
];

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

export type RuntimeState = {
  readonly spaceId?: SpaceId;
  /** The id of each seeded subject, which every peer resolves in its own replica. */
  readonly subjects?: Record<string, string>;
  /** Which peers have the space ready in their own client. */
  readonly joined: readonly boolean[];
  readonly error?: string;
};

/**
 * Two in-memory peers sharing one space: the first creates it and seeds the demo's partial, the second joins by
 * invitation. Both join when the demo opens, even one-up, so showing the second peer is instant.
 */
export class DemoRuntime {
  readonly services: ClientServicesProvider[];
  readonly #definition;
  readonly #host = new Trigger<Space>();
  readonly #listeners = new Set<() => void>();
  #state: RuntimeState = { joined: PEERS.map(() => false) };

  constructor(readonly demo: Demo) {
    const builder = new TestBuilder();
    this.services = PEERS.map(() => builder.createLocalClientServices());
    this.#definition = SampleSpace.make({
      space: { name: demo.title },
      partials: { content: demo.partial },
      build: ({ content }) => content(),
    });
  }

  get schemas() {
    return this.#definition.schemas;
  }

  getState = (): RuntimeState => this.#state;

  subscribe = (listener: () => void) => {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  };

  /** Gives peer `index` its identity and puts it in the demo's space. */
  join = (client: Client, index: number) => {
    const runtime = this;
    const peer = PEERS[index];
    return Effect.gen(function* () {
      yield* Effect.promise(() => client.waitUntilInitialized());
      if (!client.halo.identity.get()) {
        yield* Effect.promise(() =>
          client.halo.createIdentity(
            create(ProfileDocumentSchema, { displayName: peer.name, data: { hue: peer.hue } }),
          ),
        );
      }
      yield* Effect.promise(() => client.addTypes([...runtime.schemas]));
      if (!AppSpace.getSettingsSpace(client)) {
        yield* AppSpace.setupIdentitySpaces(client);
      }

      if (index === 0) {
        const space = yield* Effect.promise(() => client.spaces.create({ name: runtime.demo.title }));
        yield* Effect.promise(() => space.waitUntilReady());
        const seeded = yield* SampleSpace.applyTo(runtime.#definition, space);
        yield* Effect.promise(() => space.db.flush({ indexes: true }));
        runtime.#update({
          spaceId: space.id,
          subjects: Object.fromEntries(Object.entries(seeded).map(([key, object]) => [key, object.id])),
        });
        runtime.#host.wake(space);
      } else {
        const host = yield* Effect.promise(() => runtime.#host.wait());
        yield* Effect.promise(() => Promise.all(performInvitation({ host, guest: client.spaces })));
        const space = yield* Effect.promise(() => listed(client, host.id));
        yield* Effect.promise(() => space.waitUntilReady());
      }
      runtime.#update({ joined: runtime.#state.joined.map((joined, i) => joined || i === index) });
    }).pipe(
      Effect.tapCause((cause) => Effect.sync(() => runtime.#update({ error: `${peer.name}: ${String(cause)}` }))),
    );
  };

  #update(state: Partial<RuntimeState>) {
    this.#state = { ...this.#state, ...state };
    this.#listeners.forEach((listener) => listener());
  }
}
