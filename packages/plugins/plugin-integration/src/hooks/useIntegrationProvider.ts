//
// Copyright 2026 DXOS.org
//

import { useCapabilities } from '@dxos/app-framework/ui';

import { IntegrationProvider, type IntegrationProviderEntry } from '#types';

/**
 * Resolve contributed {@link IntegrationProviderEntry} rows by stable `id`.
 */
export const useIntegrationProvider = (providerId: string | undefined): IntegrationProviderEntry | undefined => {
  const providers = useCapabilities(IntegrationProvider).flat();
  return providerId ? providers.find((p) => p.id === providerId) : undefined;
};
