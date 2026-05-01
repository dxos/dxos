//
// Copyright 2026 DXOS.org
//

import { useCapabilities } from '@dxos/app-framework/ui';

import { IntegrationProvider, type IntegrationProviderEntry } from '#types';

/**
 * Resolve contributed {@link IntegrationProviderEntry} rows by stable `id`.
 */
export const useIntegrationProviderById = (providerId: string | undefined): IntegrationProviderEntry | undefined => {
  const providers = useCapabilities(IntegrationProvider).flat();
  return providerId ? providers.find((p) => p.id === providerId) : undefined;
};

/**
 * Deprecated: resolves by AccessToken.source; ambiguous when multiple
 * entries share `source`.
 */
export const useIntegrationProvider = (source: string | undefined): IntegrationProviderEntry | undefined => {
  const providers = useCapabilities(IntegrationProvider).flat();
  return source ? providers.find((p) => p.source === source) : undefined;
};
