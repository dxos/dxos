//
// Copyright 2026 DXOS.org
//

import { sleep } from '@dxos/async';

import { type ReplicantBrain } from '../../plan';
import { type ClientReplicant } from '../../replicants/client-replicant';
import { type ClientIndex, type Model, identityOf, resolvablePendingSpaces } from './model';
import { type EdgeStressSpec } from './spec';

/**
 * The live fleet the model is checked against, plus the bookkeeping that translates between them:
 * the model only ever names slots, so `spaceIds` and `invitationCodes` hold the real identifiers.
 */
export type Real = {
  spec: EdgeStressSpec;
  deadline: number;
  replicants: ReplicantBrain<ClientReplicant>[];
  spaceIds: string[];
  invitationCodes: string[];
  trace: (entry: Record<string, unknown>) => void;
  counters: { commands: number; documents: number };
};

/** Sentinel: the time budget ran out, which ends the sequence normally rather than failing it. */
export class BudgetExhausted extends Error {}

/**
 * Membership is per identity, but a sibling device only receives the space through HALO
 * replication, which takes time. Mid-run assertions therefore cover the devices that actually hold
 * it; the final assertion is where every member device is required to.
 */
export const devicesHoldingSpace = async (
  real: Real,
  spaceSlot: number,
  clients: ClientIndex[],
): Promise<ClientIndex[]> => {
  const held = await Promise.all(
    clients.map(async (client) => ({
      client,
      has: await real.replicants[client].brain.hasSpace({ spaceId: real.spaceIds[spaceSlot] }),
    })),
  );
  return held.filter(({ has }) => has).map(({ client }) => client);
};

/** Wait for every member device to receive the space, which is itself part of "fully replicated". */
export const awaitSpaceOnAllDevices = async (real: Real, spaceSlot: number, clients: ClientIndex[]): Promise<void> => {
  const deadline = Date.now() + real.spec.quiescenceTimeoutMs;
  while (Date.now() < deadline) {
    const holding = await devicesHoldingSpace(real, spaceSlot, clients);
    if (holding.length === clients.length) {
      return;
    }
    await sleep(500);
  }
  const holding = await devicesHoldingSpace(real, spaceSlot, clients);
  const missing = clients.filter((client) => !holding.includes(client));
  throw new Error(`space ${spaceSlot} never reached member devices ${missing.join(', ')}`);
};

export const joinSpace = async (model: Model, real: Real, client: ClientIndex, spaceSlot: number): Promise<void> => {
  const identity = identityOf(model, client);
  const space = model.spaces[spaceSlot];
  await real.replicants[client].brain.joinSpace({ invitationCode: real.invitationCodes[spaceSlot] });
  space.pending.delete(identity);
  space.members.add(identity);
};

export const joinPendingSpaces = async (model: Model, real: Real, client: ClientIndex): Promise<void> => {
  for (const slot of resolvablePendingSpaces(model, client)) {
    await joinSpace(model, real, client, slot);
  }
};

/**
 * Wait until every named device reports the EDGE peer fully caught up. A timeout here is a real
 * finding (sync stuck), not a flake, so it fails rather than proceeding.
 */
export const quiesce = async (real: Real, spaceSlot: number, clients: ClientIndex[]): Promise<void> => {
  const deadline = Date.now() + real.spec.quiescenceTimeoutMs;
  const pending = new Map<ClientIndex, string>();

  for (const client of clients) {
    await real.replicants[client].brain.flush({ spaceId: real.spaceIds[spaceSlot] });
  }

  while (Date.now() < deadline) {
    pending.clear();
    for (const client of clients) {
      const state = await real.replicants[client].brain.getSyncState({ spaceId: real.spaceIds[spaceSlot] });
      if (
        !state.connected ||
        state.missingOnLocal !== 0 ||
        state.missingOnRemote !== 0 ||
        state.differentDocuments !== 0
      ) {
        pending.set(client, JSON.stringify(state));
      }
    }
    if (pending.size === 0) {
      return;
    }
    await sleep(250);
  }

  throw new Error(
    `sync did not quiesce for space ${spaceSlot} within ${real.spec.quiescenceTimeoutMs}ms: ${JSON.stringify([
      ...pending,
    ])}`,
  );
};
