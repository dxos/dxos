//
// Copyright 2026 DXOS.org
//

import { useCapabilities } from '@dxos/app-framework/ui';
import * as Account from '@dxos/plugin-client/Account';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

/**
 * Whether a tour may start unprompted. Reads the same account-service test the onboarding flow uses
 * to decide whether to skip auth, which is what already holds the welcome tour back on localhost.
 */
export const useAutoToursEnabled = (): boolean => {
  const [client] = useCapabilities(ClientCapabilities.Client);
  return Account.isAuthEnabled(client?.config);
};
