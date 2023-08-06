//
// Copyright 2023 DXOS.org
//

import { ux } from '@oclif/core';

import { Credential } from '@dxos/client/halo';

import { maybeTruncateKey } from '../../util';

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
        header: 'id',
      },
      issuer: {
        header: 'issuer',
      },
      subject: {
        header: 'subject',
      },
      type: {
        header: 'type',
      },
    },
    {
      ...flags,
    },
  );
};
