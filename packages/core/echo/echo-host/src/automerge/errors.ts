//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/**
 * Thrown when attempting to send a message to a peer that is not connected.
 */
export class PeerNotFoundError extends BaseError.extend('PeerNotFoundError', 'Peer not found') {}
