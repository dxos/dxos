//
// Copyright 2023 DXOS.org
//

import { ux } from '@oclif/core';

import { Space, SpaceMember } from '@dxos/client';
import { Credential } from '@dxos/protocols/proto/dxos/halo/credentials';

import { maybeTruncateKey } from './util';

//
// Spaces
//

export const mapSpaces = (spaces: Space[], truncateKeys = false) => {
  return spaces.map((space) => ({
    key: maybeTruncateKey(space.key, truncateKeys),
    name: space.properties.name,
  }));
};

export const printSpaces = (spaces: Space[], flags = {}) => {
  ux.table(
    mapSpaces(spaces, true),
    {
      key: {
        header: 'Space key',
      },
      name: {
        header: 'Name',
      },
    },
    {
      ...flags,
    },
  );
};

//
// Members
//

// TODO(burdon): Export proto type.
export const mapMembers = (members: SpaceMember[], truncateKeys = false) => {
  return members.map((member) => ({
    key: maybeTruncateKey(member.identity.identityKey, truncateKeys),
    name: member.identity.profile?.displayName,
  }));
};

export const printMembers = (members: SpaceMember[], flags = {}) => {
  ux.table(
    mapMembers(members, true),
    {
      key: {
        header: 'Identity key',
      },
      name: {
        header: 'Display name',
      },
    },
    {
      ...flags,
    },
  );
};

//
// Credentials
//

export const mapCredentials = (credentials: Credential[], truncateKeys = false) => {
  return credentials.map((credential) => ({
    id: maybeTruncateKey(credential.id!, truncateKeys),
    issuer: maybeTruncateKey(credential.issuer!, truncateKeys),
    subject: maybeTruncateKey(credential.subject!.id!, truncateKeys),
    type: credential.subject.assertion['@type'],
  }));
};

export const printCredentials = (credentials: Credential[], flags = {}) => {
  ux.table(
    mapCredentials(credentials, true),
    {
      id: {
        header: 'Id',
      },
      issuer: {
        header: 'Issuer',
      },
      subject: {
        header: 'Subject',
      },
      type: {
        header: 'Type',
      },
    },
    {
      ...flags,
    },
  );
};
