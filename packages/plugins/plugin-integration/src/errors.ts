//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

const NO_PROVIDER_MESSAGE = 'No IntegrationProvider registered with id.' as const;

/** No capability row matches the requested `providerId`. */
export class IntegrationProviderNotFoundError extends BaseError.extend(
  'IntegrationProviderNotFoundError',
  NO_PROVIDER_MESSAGE,
) {
  constructor(providerId: string) {
    super({ context: { providerId } });
  }
}
