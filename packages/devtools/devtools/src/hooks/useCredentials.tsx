//
// Copyright 2023 DXOS.org
//

import { useEffect, useState } from 'react';

import { type PublicKey } from '@dxos/keys';
import { buf } from '@dxos/protocols/buf';
import { decodeCompat } from '@dxos/protocols/buf-shape-compat';
import { CredentialSchema } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
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
    stream.subscribe((credential) => {
      // The panels index `subject.assertion` by '@type', which is the protobuf.js Any substitution.
      newCredentials.push(decodeCompat(CredentialSchema, buf.toBinary(CredentialSchema, credential)));
      setCredentials([...newCredentials]);
    });

    return () => {
      void stream.close();
    };
  }, [spaceKey?.toHex()]);

  return credentials;
};
