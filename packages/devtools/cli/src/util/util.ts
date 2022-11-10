//
// Copyright 2022 DXOS.org
//

import { CliUx } from '@oclif/core';

import { Party, PartyMember } from '@dxos/client';
import { truncateKey } from '@dxos/debug';
import { PublicKey } from '@dxos/keys';

const maybeTruncateKey = (key: PublicKey, truncate = false) => (truncate ? truncateKey(key.toHex(), 8) : key.toHex());

//
// Spaces
//

export const selectSpace = async (parties: Party[]) => {
  // eslint-disable-next-line no-eval
  const inquirer = (await eval('import("inquirer")')).default;
  const { key } = await inquirer.prompt([
    {
      name: 'key',
      type: 'list',
      message: 'Select a space:',
      choices: parties.map((party) => ({
        name: `[${truncateKey(party.key, 8)}] ${party.getProperty('name')}`,
        value: party.key
      }))
    }
  ]);

  return key;
};

export const mapSpaces = (parties: Party[], truncateKeys = false) => {
  return parties.map((party) => ({
    key: maybeTruncateKey(party.key, truncateKeys),
    name: party.getProperty('name')
  }));
};

export const printSpaces = (parties: Party[], flags = {}) => {
  CliUx.ux.table(
    mapSpaces(parties, true),
    {
      key: {
        header: 'Space key'
      },
      name: {
        header: 'Name'
      }
    },
    {
      ...flags
    }
  );
};

//
// Members
//

// TODO(burdon): Export proto type.
export const mapMembers = (members: PartyMember[], truncateKeys = false) => {
  return members.map((member) => ({
    key: maybeTruncateKey(member.identityKey, truncateKeys),
    name: member.profile?.displayName
  }));
};

export const printMembers = (members: PartyMember[], flags = {}) => {
  CliUx.ux.table(
    mapMembers(members, true),
    {
      key: {
        header: 'Identity key'
      },
      name: {
        header: 'Display name'
      }
    },
    {
      ...flags
    }
  );
};
