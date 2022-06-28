//
// Copyright 2020 DXOS.org
//

import debug from 'debug';

import { NetworkManagerOptions } from '@dxos/network-manager';
import { Storage, createStorage, StorageType } from '@dxos/random-access-multi-storage';
import { jsonReplacer } from '@dxos/util';

import { ECHO } from '../echo';
import { DataParty } from '../parties';

export const log = debug('dxos:echo-db:testing');

export const messageLogger = (tag: string) => (message: any) => {
  log(tag, JSON.stringify(message, jsonReplacer, 2));
};

export interface TestOptions {
  verboseLogging?: boolean
  initialize?: boolean
  storage?: Storage
  keyStorage?: any
  networkManagerOptions?: NetworkManagerOptions
  // TODO(burdon): Group properties by hierarchical object.
  snapshots?: boolean
  snapshotInterval?: number
}

/**
 * Creates ECHO instance for testing.
 */
export const createTestInstance = async ({
  verboseLogging = false,
  initialize = false,
  storage = createStorage('', StorageType.RAM),
  keyStorage = undefined,
  networkManagerOptions,
  snapshots = true,
  snapshotInterval
}: TestOptions = {}) => {
  const echo = new ECHO({
    storage,
    keyStorage,
    snapshotInterval,
    snapshots,
    networkManagerOptions,
    readLogger: verboseLogging ? messageLogger('>>>') : undefined,
    writeLogger: verboseLogging ? messageLogger('<<<') : undefined
  });

  if (initialize) {
    await echo.open();
    await echo.halo.createProfile();
  }

  return echo;
};

/**
 * Invites a test peer to the party.
 * @returns Party instance on provided test instance.
 */
export const inviteTestPeer = async (party: DataParty, peer: ECHO): Promise<DataParty> => {
  const invitation = await party.invitationManager.createInvitation({
    secretValidator: async () => true
  });

  return peer.joinParty(invitation, async () => Buffer.from('0000'));
};
