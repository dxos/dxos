//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import stableStringify from 'json-stable-stringify';

import { keyToBuffer, keyToString, ripemd160, PublicKey } from '@dxos/crypto';
import { SwarmKey } from '@dxos/echo-protocol';

import { InvalidInvitationError } from '../errors';

/**
 * Defines an invitation type.
 *
 * Interactive invitation is when both peers are online at the same time.
 *
 * Offline is when only a single peer needs to be online at the time.
 */
export enum InvitationDescriptorType {
  INTERACTIVE = '1',
  OFFLINE_KEY = '2',
}

/**
 * A serialized version of InvitationDescriptor that's sutable to be encoded as an URL query string.
 */
export interface InvitationQueryParameters {
  hash: string
  swarmKey: string
  invitation: string
  identityKey?: string
  type: string
}

// TODO(telackey): Add class description:
// TODO(telackey): Add comment explaining in brief what is going on.
//  e.g. what is hash for?
//  e.g. do we expect users of this class to serialize it themselves?
/**
 * Description of what this class is for goes here.
 */
export class InvitationDescriptor {
  static fromQueryParameters (queryParameters: InvitationQueryParameters): InvitationDescriptor {
    const { hash, swarmKey, invitation, identityKey, type } = queryParameters;

    const descriptor = new InvitationDescriptor(type as InvitationDescriptorType, keyToBuffer(swarmKey),
      keyToBuffer(invitation), identityKey ? PublicKey.from(identityKey) : undefined);

    if (hash !== descriptor.hash) {
      throw new InvalidInvitationError();
    }

    return descriptor;
  }

  // TODO(dboreham): Switch back to private member variables since we have encapsulated this class everywhere.
  constructor (
    public readonly type: InvitationDescriptorType,
    public readonly swarmKey: SwarmKey,
    public readonly invitation: Buffer,
    public readonly identityKey?: PublicKey
  ) {
    assert(type);
    assert(Buffer.isBuffer(swarmKey));
    assert(Buffer.isBuffer(invitation));
    if (identityKey) {
      PublicKey.assertValidPublicKey(identityKey);
    }

    this.type = type;
    this.swarmKey = swarmKey;
    this.invitation = invitation;
    this.identityKey = identityKey;
  }

  get hash () {
    const query = this.toQueryParameters();
    return query.hash;
  }

  /**
   * Exports an InvitationDescriptor to an object suitable for use as query parameters.
   */
  toQueryParameters (): InvitationQueryParameters {
    const query: Partial<InvitationQueryParameters> = {
      swarmKey: keyToString(this.swarmKey),
      invitation: keyToString(this.invitation),
      type: this.type
    };

    if (this.identityKey) {
      query.identityKey = this.identityKey.toHex();
    }

    query.hash = ripemd160(stableStringify(query));

    return query as InvitationQueryParameters;
  }
}
