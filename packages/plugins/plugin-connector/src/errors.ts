//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

const NO_CONNECTOR_MESSAGE = 'No Connector registered with id.' as const;

const SPACE_UNAVAILABLE_MESSAGE = 'Space is not available for the connection flow.' as const;

/** No Connector capability row matches the requested `connectorId`. */
export class ConnectorNotFoundError extends BaseError.extend('ConnectorNotFoundError', NO_CONNECTOR_MESSAGE) {
  constructor(connectorId: string) {
    super({ context: { connectorId } });
  }
}

/**
 * The space referenced by an in-flight connection flow could not be made
 * available — either it isn't registered with the client (e.g. the user
 * signed out between OAuth start and callback) or it failed to become ready
 * (network, replication, etc.). Both cases are equivalent from the flow's
 * perspective: there's no space to write the connection into.
 */
export class SpaceUnavailableError extends BaseError.extend('SpaceUnavailableError', SPACE_UNAVAILABLE_MESSAGE) {
  constructor(spaceId: string, cause?: unknown) {
    super({ context: { spaceId }, cause });
  }
}
