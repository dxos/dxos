//
// Copyright 2022 DXOS.org
//

import { CliUx } from '@oclif/core';

import { Space, SpaceMember } from '@dxos/client';
import { truncateKey } from '@dxos/debug';
import { PublicKey } from '@dxos/keys';

const maybeTruncateKey = (key: PublicKey, truncate = false) => (truncate ? truncateKey(key.toHex(), 8) : key.toHex());

//
// Spaces
//

export const selectSpace = async (spaces: Space[]) => {
  // eslint-disable-next-line no-eval
  const inquirer = (await eval('import("inquirer")')).default;
  const { key } = await inquirer.prompt([
    {
      name: 'key',
      type: 'list',
      message: 'Select a space:',
      choices: spaces.map((space) => ({
        name: `[${truncateKey(space.key, 8)}] ${space.getProperty('name')}`,
        value: space.key
      }))
    }
  ]);

  return key;
};

export const mapSpaces = (spaces: Space[], truncateKeys = false) => {
  return spaces.map((space) => ({
    key: maybeTruncateKey(space.key, truncateKeys),
    name: space.getProperty('name')
  }));
};

export const printSpaces = (spaces: Space[], flags = {}) => {
  CliUx.ux.table(
    mapSpaces(spaces, true),
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
export const mapMembers = (members: SpaceMember[], truncateKeys = false) => {
  return members.map((member) => ({
    key: maybeTruncateKey(member.identityKey, truncateKeys),
    name: member.profile?.displayName
  }));
};

export const printMembers = (members: SpaceMember[], flags = {}) => {
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
