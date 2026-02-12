//
// Copyright 2023 DXOS.org
//

import { useEffect, useState } from 'react';

import { type PublicKey } from '@dxos/keys';
import { type Credential as BufCredential } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { type Credential } from '@dxos/protocols/proto/dxos/halo/credentials';
import { useClient } from '@dxos/react-client';

export const useCredentials = ({ spaceKey }: { spaceKey?: PublicKey }) => {
  const client = useClient();
  const spacesService = client?.services?.services?.SpacesService;
  if (!spacesService) {
    throw new Error('Client services not available.');
  }

  const [credentials, setCredentials] = useState<Credential[]>([]);

  useEffect(() => {
    if (!spaceKey) {
      return;
    }

    const newCredentials: Credential[] = [];
    const stream = spacesService.queryCredentials({ spaceKey });
    stream.subscribe((credential: BufCredential) => {
      newCredentials.push(credential as never);
      setCredentials([...newCredentials]);
    });

    return () => {
      void stream.close();
    };
  }, [spaceKey?.toHex()]);

  return credentials;
};
