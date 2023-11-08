//
// Copyright 2023 DXOS.org
//

import { useEffect, useState } from 'react';

import { type PublicKey } from '@dxos/keys';
import { type Credential } from '@dxos/protocols/proto/dxos/halo/credentials';
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

    const newCredentials: Credential[] = [];
    const stream = services.SpacesService.queryCredentials({ spaceKey });
    stream.subscribe((credential) => {
      newCredentials.push(credential);
      setCredentials([...newCredentials]);
    });

    return () => {
      void stream.close();
    };
  }, [spaceKey?.toHex()]);

  return credentials;
};
