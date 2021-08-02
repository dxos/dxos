//
// Copyright 2020 DXOS.org
//

import debug from 'debug';

import { createKeyPair } from '@dxos/crypto';
import { NetworkManagerOptions } from '@dxos/network-manager';
import { IStorage } from '@dxos/random-access-multi-storage';
import { jsonReplacer } from '@dxos/util';

import { ECHO } from '../echo';
import { Party } from '../parties';
import { createRamStorage } from './persistant-ram-storage';

const log = debug('dxos:echo:testing');

export const messageLogger = (tag: string) => (message: any) => {
  log(tag, JSON.stringify(message, jsonReplacer, 2));
};

export interface TestOptions {
  verboseLogging?: boolean
  initialize?: boolean
  storage?: any
  keyStorage?: any
  networkManagerOptions?: NetworkManagerOptions
  // TODO(burdon): Group properties by hierarchical object.
  snapshots?: boolean
  snapshotInterval?: number
  snapshotStorage?: IStorage
}

/**
 * Creates ECHO instance for testing.
 */
export const createTestInstance = async ({
  verboseLogging = false,
  initialize = false,
  storage = createRamStorage(),
  keyStorage = undefined,
  networkManagerOptions,
  snapshotStorage = createRamStorage(),
  snapshots = true,
  snapshotInterval
}: TestOptions = {}) => {
  const echo = new ECHO({
    feedStorage: storage,
    keyStorage,
    snapshotStorage,
    snapshotInterval,
    snapshots,
    networkManagerOptions,
    readLogger: verboseLogging ? messageLogger('>>>') : undefined,
    writeLogger: verboseLogging ? messageLogger('<<<') : undefined
  });

  if (initialize) {
    await echo.open();
    if (!echo.halo.identityKey) {
      await echo.halo.createIdentity(createKeyPair());
    }
    if (!echo.halo.isInitialized) {
      await echo.halo.create();
    }
  }

  return echo;
};

/**
 * Invites a test peer to the party.
 * @returns Party instance on provided test instance.
 */
export const inviteTestPeer = async (party: Party, peer: ECHO): Promise<Party> => {
  const invitation = await party.createInvitation({
    secretValidator: async () => true
  });

  return peer.joinParty(invitation, async () => Buffer.from('0000'));
};
