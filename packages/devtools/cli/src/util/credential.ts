//
// Copyright 2023 DXOS.org
//

import { Trigger } from '@dxos/async';
import { Client } from '@dxos/client';
import { Credential } from '@dxos/protocols/proto/dxos/halo/credentials';

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
