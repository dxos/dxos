//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Stream from 'effect/Stream';

import * as AgentService from '@dxos/compute/AgentService';
import { Space } from '@dxos/halo';
import { IdentityDid } from '@dxos/keys';
import { type FactStoreApi } from '@dxos/pipeline-rdf';

import { BrainService } from '#types';

import { TriggerRegistry } from '../triggers.ts';
import * as BrainMemory from './BrainMemory.ts';

export type TestBrainOptions = {
  /**
   * `session` submits a woken prompt to the chat's session, so a turn runs there; `record` only keeps
   * the request, for tests of where a delivery goes rather than what the agent then says.
   * @default 'session'
   */
  wake?: 'session' | 'record';
};

/**
 * One in-memory brain for a test file: the layer can be provided both to the resolver (operations) and
 * to the test body, and every build sees the same stores.
 */
export const makeTestBrain = ({ wake = 'session' }: TestBrainOptions = {}) => {
  const triggers = new TriggerRegistry();
  const stores = new Map<string, FactStoreApi>();
  const wakes: BrainService.WakeRequest[] = [];

  const layer: Layer.Layer<BrainService.BrainService, never, AgentService.AgentService> = Layer.effect(
    BrainService.BrainService,
    AgentService.AgentService.pipe(
      Effect.map((agents) => {
        // Built once per layer, each with its own host's agents, over the same stores.
        const { service: memory } = BrainMemory.make(agents, { triggers, stores });
        // Triggers come back through JSON, as from EDGE's brain: their refs then have no resolver of their own.
        const service: BrainService.Service = {
          ...memory,
          subscriptions: (agent) =>
            memory
              .subscriptions(agent)
              .pipe(
                Effect.map((listed) =>
                  listed.map((trigger) =>
                    BrainService.decodeTrigger(JSON.parse(JSON.stringify(BrainService.encodeTrigger(trigger)))),
                  ),
                ),
              ),
        };
        return wake === 'session'
          ? service
          : { ...service, wake: (request: BrainService.WakeRequest) => Effect.sync(() => void wakes.push(request)) };
      }),
    ),
  );

  return {
    layer,
    triggers,
    wakes,
    /** The agent's fact store, if it has recorded any facts. */
    facts: (agent: string) => stores.get(agent),
  };
};

const memberDid = (seed: number): IdentityDid => IdentityDid.encode(new Uint8Array(IdentityDid.byteLength).fill(seed));

/** The space members tests speak as, by first name; facts are attributed to their DIDs. */
export const TEST_MEMBERS = {
  dima: memberDid(1),
  rich: memberDid(2),
  josiah: memberDid(3),
  alice: memberDid(4),
  bob: memberDid(5),
} as const;

const unsupported = () => Effect.die(new Error('Not available in the test space service.'));

/** HALO's `Space.Service` answering only membership, with the given members. */
export const makeTestSpaceLayer = (
  members: readonly { did: string; displayName: string }[],
): Layer.Layer<Space.Service> =>
  Layer.succeed(Space.Service, {
    members: () =>
      Stream.make(
        members.map(({ did, displayName }): Space.Member => ({
          did: IdentityDid.make(did),
          displayName,
          role: 'edit',
          online: true,
        })),
      ),
    get: (id) => Effect.succeed(Option.some({ id, state: 'ready' as const })),
    spaces: Stream.empty,
    create: unsupported,
    waitReady: () => Effect.void,
    setEdgeReplication: unsupported,
    updateMemberRole: unsupported,
    removeMember: unsupported,
    share: unsupported,
    join: unsupported,
    invitations: () => Stream.empty,
    export: unsupported,
    import: unsupported,
  });

/** {@link makeTestSpaceLayer} over {@link TEST_MEMBERS}. */
export const testSpaceLayer = makeTestSpaceLayer([
  { did: TEST_MEMBERS.dima, displayName: 'Dima' },
  { did: TEST_MEMBERS.rich, displayName: 'Rich Burdon' },
  { did: TEST_MEMBERS.josiah, displayName: 'Josiah' },
  { did: TEST_MEMBERS.alice, displayName: 'Alice' },
  { did: TEST_MEMBERS.bob, displayName: 'Bob' },
]);
