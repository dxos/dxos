//
// Copyright 2022 DXOS.org
//

import { PartySerializer } from '@dxos/client';
import { useClient } from '@dxos/react-client';

export const usePartySerializer = () => {
  const client = useClient();
  const serializer = new PartySerializer(client);
  return serializer;
};
