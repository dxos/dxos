//
// Copyright 2023 DXOS.org
//

import { useEffect, useState } from 'react';

import { PublicKey } from '@dxos/keys';
import { Credential } from '@dxos/protocols/proto/dxos/halo/credentials';
import { useClientServices } from '@dxos/react-client';

export const useCredentials = ({ spaceKey }: { spaceKey?: PublicKey }) => {
  const services = useClientServices();
  if (!services) {
    throw new Error('Client services not available.');
  }

  const [credentials, setCredentials] = useState<Credential[]>([]);

  useEffect(() => {
    if (!spaceKey) {
      return;
    }
    const stream = services.SpacesService.queryCredentials({ spaceKey });
    const newCredentials: Credential[] = [];

    stream.subscribe((credential) => {
      newCredentials.push(credential);
      setCredentials([...newCredentials]);
    });

    return () => {
      stream.close();
    };
  }, [spaceKey?.toHex()]);

  return credentials;
};
