//
// Copyright 2026 DXOS.org
//

import { useCapabilities } from '@dxos/app-framework/ui';
import { getEnvString } from '@dxos/config';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

/**
 * Whether a tour may start unprompted.
 *
 * Keyed on the hub URL, which is exactly what the onboarding flow reads to decide whether to skip
 * auth, and so what already holds the welcome tour back on localhost. Reading the same value here
 * keeps one answer to "is this a local dev profile" rather than two that can disagree.
 */
export const useAutoToursEnabled = (): boolean => {
  const [client] = useCapabilities(ClientCapabilities.Client);
  return !!client && !!getEnvString(client.config, 'DX_HUB_URL');
};
