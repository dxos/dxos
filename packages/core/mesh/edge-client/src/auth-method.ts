//
// Copyright 2026 DXOS.org
//

import { log } from '@dxos/log';
import { EdgeCallFailedError } from '@dxos/protocols';

import { type EdgeIdentity, handleAuthChallenge } from './edge-identity';
import { encodeAuthHeader } from './http-client';

/**
 * Pluggable authentication strategy for {@link BaseHttpClient}.
 *
 * One strategy per client instance. To act as a different principal (e.g. an
 * API key instead of the signed-in identity), construct a separate client.
 */
export interface EdgeAuthMethod {
  /**
   * Header to attach before any challenge. Static credentials (API keys) return
   * it eagerly; challenge-based methods return `undefined` until a 401 is handled.
   */
  getHeader(): string | undefined;

  /**
   * Establish or refresh the auth header in response to a 401, or throw if the
   * credential cannot be (re)established.
   */
  onUnauthorized(response: Response): Promise<string>;

  /** Whether the `/auth` challenge pre-fetch (`auth: true`) flow applies. */
  readonly canPrefetch: boolean;
}

/**
 * Verifiable-presentation auth: signs a fresh challenge from the edge `/auth`
 * endpoint with an {@link EdgeIdentity} and refreshes on 401. The default for
 * user-scoped edge calls.
 */
export class VerifiablePresentationAuth implements EdgeAuthMethod {
  readonly canPrefetch = true;
  private _identity: EdgeIdentity | undefined;

  constructor(identity?: EdgeIdentity) {
    this._identity = identity;
  }

  get identity(): EdgeIdentity | undefined {
    return this._identity;
  }

  /** Updates the identity; returns true if it changed (so cached headers should be cleared). */
  setIdentity(identity: EdgeIdentity): boolean {
    if (this._identity?.identityKey !== identity.identityKey || this._identity?.peerKey !== identity.peerKey) {
      this._identity = identity;
      return true;
    }
    return false;
  }

  getHeader(): string | undefined {
    return undefined;
  }

  async onUnauthorized(response: Response): Promise<string> {
    if (!this._identity) {
      log.warn('unauthorized response received before identity was set');
      throw await EdgeCallFailedError.fromHttpFailure(response);
    }
    const challenge = await handleAuthChallenge(response, this._identity);
    return encodeAuthHeader(challenge);
  }
}

/**
 * Static API-key auth: attaches a fixed `Bearer <token>` header. Used for
 * admin-key access today and non-admin API keys in future. Cannot refresh, so a
 * 401 surfaces as a failure rather than triggering a challenge.
 */
export class ApiKeyAuth implements EdgeAuthMethod {
  readonly canPrefetch = false;

  constructor(private readonly _token: string) {}

  getHeader(): string | undefined {
    return `Bearer ${this._token}`;
  }

  async onUnauthorized(response: Response): Promise<string> {
    throw await EdgeCallFailedError.fromHttpFailure(response);
  }
}
