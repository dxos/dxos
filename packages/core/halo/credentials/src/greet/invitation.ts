//
// Copyright 2019 DXOS.org
//

import { randomBytes } from '@dxos/crypto';
import { PublicKey, PublicKeyLike } from '@dxos/keys';

import { createDateTimeString } from '../proto';

/**
 * Info required for offline invitations.
 */
// TODO(burdon): Define types.
export interface SecretInfo {
  id: any
  authNonce: any
}

/**
 * Provides a shared secret during an invitation process.
 */
export type SecretProvider = (info?: SecretInfo) => Promise<Buffer>

/**
 * Validates the shared secret during an invitation process.
 */
export type SecretValidator = (invitation: Invitation, secret: Buffer) => Promise<boolean>

export const defaultSecretProvider: SecretProvider = async () => Buffer.from('0000');

export const defaultSecretValidator: SecretValidator =
  async (invitation, secret) => secret && Buffer.isBuffer(invitation.secret) && secret.equals(invitation.secret);

// TODO(burdon): Pass state?
export type InvitationOnFinish = () => Promise<void>

/**
 * Represents a single-use invitation to admit the Invitee to the Party.
 * During Greeting the invitation will cross through the states:
 *
 * 1. issued
 * 2. presented
 * 3. negotiated
 * 4. submitted
 * 5. finished
 *
 * It may also be revoked at anytime.
 */
export class Invitation {
  private readonly _partyKey: PublicKey;
  private readonly _secretValidator: SecretValidator;
  private readonly _secretProvider?: SecretProvider;
  private readonly _onFinish?: InvitationOnFinish;
  private readonly _expiration?: number;

  private readonly _id: Buffer = randomBytes(32);
  private readonly _authNonce = randomBytes(32);
  private readonly _nonce = randomBytes(32);
  private _secret?: Buffer;

  private readonly _issued = createDateTimeString();
  private _began?: string;
  private _handshook?: string;
  private _notarized?: string;
  private _finished?: string;
  private _revoked?: string;

  /**
   * @constructor
   */
  constructor (partyKey: PublicKeyLike,
    secretValidator: SecretValidator,
    secretProvider?: SecretProvider,
    onFinish?: InvitationOnFinish,
    expiration = 0) {
    this._partyKey = PublicKey.from(partyKey);
    this._secretValidator = secretValidator;
    this._secretProvider = secretProvider;
    this._onFinish = onFinish;
    this._expiration = expiration;
  }

  get id () {
    return this._id;
  }

  get authNonce () {
    return this._authNonce;
  }

  get nonce () {
    return this._nonce;
  }

  get partyKey () {
    return this._partyKey;
  }

  get issued () {
    return this._issued;
  }

  get live () {
    return !this.finished && !this.expired && !this.revoked;
  }

  get began () {
    return !!this._began;
  }

  get notarized () {
    return !!this._notarized;
  }

  get handshook () {
    return !!this._handshook;
  }

  get revoked () {
    return !!this._revoked;
  }

  get finished () {
    return !!this._finished;
  }

  get expired () {
    if (this._expiration) {
      return Date.now() >= this._expiration;
    }
    return false;
  }

  get secret () {
    return this._secret;
  }

  /**
   * Revokes the invitation.
   * @returns {Promise<boolean>} true if the invitation was alive, else false
   */
  async revoke () {
    if (!this.live) {
      return false;
    }

    this._revoked = createDateTimeString();

    return true;
  }

  /**
   * Handles invitation presentation (ie, triggers the secretProvider) and
   * marks the invitation as having been presented.
   * @returns {Promise<boolean>} true if the invitation was alive, else false
   */
  async begin () {
    if (!this.live) {
      return false;
    }

    if (!this._secret && this._secretProvider) {
      this._secret = await this._secretProvider({ // TODO(burdon): Delay.
        id: this.id,
        authNonce: this.authNonce
      });
    }

    this._began = createDateTimeString();

    return true;
  }

  /**
   * Marks the invitation as having been negotiated.
   * @returns {Promise<boolean>} true if the invitation was alive, else false
   */
  async handshake () {
    if (!this.live) {
      return false;
    }

    this._handshook = createDateTimeString();

    return true;
  }

  /**
   * Marks the invitation as having been submitted.
   * @returns {Promise<boolean>} true if the invitation was alive, else false
   */
  async notarize () {
    if (!this.live) {
      return false;
    }

    this._notarized = createDateTimeString();

    return true;
  }

  /**
   * Marks the invitation as having been finished and triggers any
   * onFinish handlers if present.
   * @returns {Promise<boolean>} true if the invitation was alive, else false
   */
  async finish () {
    if (!this.live) {
      return false;
    }

    this._finished = createDateTimeString();
    if (this._onFinish) {
      await this._onFinish();
    }

    return true;
  }

  /**
   * Returns `true` if the invitation and secret are valid, else `false`.
   * @returns {Promise<boolean>}
   */
  async validate (secret: Buffer) {
    return this._secretValidator(this, secret);
  }
}
