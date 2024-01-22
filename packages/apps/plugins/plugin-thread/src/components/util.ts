//
// Copyright 2024 DXOS.org
//

import { generateName } from '@dxos/display-name';
import { PublicKey } from '@dxos/react-client';
import { type SpaceMember } from '@dxos/react-client/echo';
import { type Identity } from '@dxos/react-client/halo';

export type BlockProperties = {
  displayName?: string;
  classes?: string;
};

export type BlockPropertiesProvider = (identityKey: PublicKey | undefined) => BlockProperties;

const colors = [
  'text-blue-300',
  'text-green-300',
  'text-red-300',
  'text-cyan-300',
  'text-indigo-300',
  'text-teal-300',
  'text-orange-300',
  'text-purple-300',
];

// TODO(burdon): Factor out.
const colorHash = (key: PublicKey) => {
  const num = Number('0x' + key.toHex().slice(0, 8));
  return colors[num % colors.length];
};

export const createPropertiesProvider = (identity: Identity, members: SpaceMember[]): BlockPropertiesProvider => {
  return (identityKey: PublicKey | undefined) => {
    const author =
      identityKey && PublicKey.equals(identityKey, identity.identityKey)
        ? identity
        : members.find((member) => identityKey && PublicKey.equals(member.identity.identityKey, identityKey))?.identity;

    const key = author?.identityKey ?? identityKey;
    return {
      displayName: author?.profile?.displayName ?? (identityKey ? generateName(identityKey.toHex()) : ''),
      classes: key ? colorHash(key) : undefined,
    };
  };
};

export const safeParseJson = (data: string) => {
  try {
    return JSON.parse(data);
  } catch (err) {
    return data;
  }
};
