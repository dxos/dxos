//
// Copyright 2026 DXOS.org
//

import { useCapabilities } from '@dxos/app-framework/ui';
import * as Account from '@dxos/plugin-client/Account';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

export const useAutoToursEnabled = (): boolean => {
  const [client] = useCapabilities(ClientCapabilities.Client);
  return Account.isAuthEnabled(client?.config);
};
