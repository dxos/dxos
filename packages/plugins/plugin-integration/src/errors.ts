//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

const NO_PROVIDER_MESSAGE = 'No IntegrationProvider registered with id.' as const;

const SPACE_UNAVAILABLE_MESSAGE = 'Space is not available for the integration flow.' as const;

/** No capability row matches the requested `providerId`. */
export class IntegrationProviderNotFoundError extends BaseError.extend(
  'IntegrationProviderNotFoundError',
  NO_PROVIDER_MESSAGE,
) {
  constructor(providerId: string) {
    super({ context: { providerId } });
  }
}

/**
 * The space referenced by an in-flight integration flow could not be made
 * available — either it isn't registered with the client (e.g. the user
 * signed out between OAuth start and callback) or it failed to become ready
 * (network, replication, etc.). Both cases are equivalent from the flow's
 * perspective: there's no space to write the integration into.
 */
export class SpaceUnavailableError extends BaseError.extend('SpaceUnavailableError', SPACE_UNAVAILABLE_MESSAGE) {
  constructor(spaceId: string, cause?: unknown) {
    super({ context: { spaceId }, cause });
  }
}
