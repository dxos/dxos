//
// Copyright 2023 DXOS.org
//

import { ux } from '@oclif/core';

import { Trigger } from '@dxos/async';
import { type Client } from '@dxos/client';
import { type Credential } from '@dxos/protocols/proto/dxos/halo/credentials';

import { maybeTruncateKey } from './types';

const timeout = 500;

export const queryCredentials = async (
  client: Client,
  type?: string,
  predicate?: (value: Credential) => boolean,
): Promise<Credential[]> => {
  const credentialsQuery = client.halo.queryCredentials({ type });
  const trigger = new Trigger<Credential[]>();
  let result: Credential[] = [];
  credentialsQuery.subscribe({
    onUpdate: (credentials: Credential[]) => {
      if (predicate) {
        result = credentials.filter(predicate);
      } else {
        result = credentials;
      }
    },
    onError: (err) => {
      throw err;
    },
  });

  setTimeout(() => {
    trigger.wake(result);
  }, timeout);

  await trigger.wait();
  return result;
};

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
