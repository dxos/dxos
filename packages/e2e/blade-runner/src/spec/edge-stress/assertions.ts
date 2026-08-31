//
// Copyright 2026 DXOS.org
//

import { log } from '@dxos/log';

import { type SpaceDigest } from '../../replicants/client-replicant';
import { type ClientIndex, type Model, canonical, expectedDigest, onlineMemberDevices } from './model';
import { type Real, awaitSpaceOnAllDevices, devicesHoldingSpace, joinPendingSpaces, quiesce } from './system';

export const assertDigestsAgree = (
  digests: { client: ClientIndex; digest: SpaceDigest }[],
  spaceSlot: number,
): void => {
  if (digests.length < 2) {
    return;
  }
  const [reference, ...rest] = digests;
  for (const other of rest) {
    const a = canonical(reference.digest);
    const b = canonical(other.digest);
    if (a !== b) {
      throw new Error(
        `peers disagree on space ${spaceSlot}: client ${reference.client} = ${a}, client ${other.client} = ${b}`,
      );
    }
  }
};

/**
 * Everything a peer holds must be something the model knows about. The converse does not hold
 * mid-run: ops authored by a client that is currently offline may legitimately be missing.
 */
export const assertSubsetOfModel = (
  model: Model,
  spaceSlot: number,
  client: ClientIndex,
  digest: SpaceDigest,
): void => {
  const expected = expectedDigest(model, spaceSlot);
  for (const [docId, actual] of Object.entries(digest.docs)) {
    const reference = expected.docs[docId];
    if (!reference) {
      throw new Error(`client ${client} has unknown or deleted document ${docId} in space ${spaceSlot}`);
    }
    for (const value of actual.tokens) {
      if (!reference.tokens.includes(value)) {
        throw new Error(`client ${client} has unknown token ${value} in ${docId}`);
      }
    }
    actual.counters.forEach((value, slot) => {
      const limit = reference.counters[slot] ?? 0;
      if (value > limit) {
        throw new Error(`client ${client} counter ${slot} on ${docId} is ${value}, above the model's ${limit}`);
      }
    });
  }
};

export const assertEqualsModel = (model: Model, spaceSlot: number, client: ClientIndex, digest: SpaceDigest): void => {
  const expected = canonical(expectedDigest(model, spaceSlot));
  const actual = canonical(digest);
  if (expected !== actual) {
    throw new Error(
      `client ${client} diverged from the model on space ${spaceSlot}:\n  model:  ${expected}\n  client: ${actual}`,
    );
  }
};

/**
 * Mid-run assertion: quiesce every online member of every space against EDGE and require them to
 * agree with each other and to hold nothing the model does not know about.
 */
export const runCheckpoint = async (model: Model, real: Real): Promise<void> => {
  for (let slot = 0; slot < model.spaces.length; slot++) {
    const devices = await devicesHoldingSpace(real, slot, onlineMemberDevices(model, slot));
    if (devices.length === 0) {
      continue;
    }
    await quiesce(real, slot, devices);
    const digests = await Promise.all(
      devices.map(async (client) => ({
        client,
        digest: await real.replicants[client].brain.digest({ spaceId: real.spaceIds[slot] }),
      })),
    );
    assertDigestsAgree(digests, slot);
    for (const { client, digest } of digests) {
      assertSubsetOfModel(model, slot, client, digest);
    }
  }
};

/**
 * The main assertion: bring everybody online, resolve every outstanding join, quiesce, and require
 * every device of every member identity to equal the model exactly.
 */
export const assertFullyReplicated = async (model: Model, real: Real): Promise<void> => {
  for (let client = 0; client < model.clients.length; client++) {
    if (model.clients[client].state === 'offline') {
      await real.replicants[client].brain.goOnline();
      model.clients[client].state = 'online';
    } else if (model.clients[client].state === 'down') {
      await real.replicants[client].brain.restart();
      model.clients[client].state = 'online';
    }
  }
  for (let client = 0; client < model.clients.length; client++) {
    await joinPendingSpaces(model, real, client);
  }

  for (let slot = 0; slot < model.spaces.length; slot++) {
    const devices = onlineMemberDevices(model, slot);
    log.info('final assertion', { space: slot, devices });
    await awaitSpaceOnAllDevices(real, slot, devices);
    await quiesce(real, slot, devices);
    for (const client of devices) {
      const digest = await real.replicants[client].brain.digest({ spaceId: real.spaceIds[slot] });
      assertEqualsModel(model, slot, client, digest);
    }
  }
};
