//
// Copyright 2023 DXOS.org
//

import { type Credential } from '@dxos/protocols/proto/dxos/halo/credentials';

import { maybeTruncateKey } from './keys';

export const mapCredentials = (credentials: Credential[], truncateKeys = false) =>
  credentials.map((credential) => ({
    id: maybeTruncateKey(credential.id!, truncateKeys),
    issuer: maybeTruncateKey(credential.issuer!, truncateKeys),
    subject: maybeTruncateKey(credential.subject!.id!, truncateKeys),
    type: credential.subject.assertion['@type'],
    assertion: credential.subject.assertion,
  }));

export const printCredentials = (credentials: Credential[], flags = {}) => {
  console.log(credentials);
  // ux.table(
  //   mapCredentials(credentials, true),
  //   {
  //     id: {
  //       header: 'id',
  //     },
  //     issuer: {
  //       header: 'issuer',
  //     },
  //     subject: {
  //       header: 'subject',
  //     },
  //     type: {
  //       header: 'type',
  //     },
  //   },
  //   {
  //     ...flags,
  //   },
  // );
};
