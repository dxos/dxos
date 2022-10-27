//
// Copyright 2020 DXOS.org
//

import base from 'base-x';
import stableStringify from 'json-stable-stringify';
import assert from 'node:assert';

import { ripemd160 } from '@dxos/crypto';
import { InvalidInvitationError } from '@dxos/echo-db';
import { PublicKey } from '@dxos/keys';
import { InvitationDescriptor } from '@dxos/protocols/proto/dxos/halo/invitations';

// TODO(burdon): Move to Client API.

// Encode with only alpha-numeric characters.
const base62 = base('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');

/**
 * A serialized version of InvitationWrapper that's suitable to be encoded as an URL query string.
 */
export interface InvitationQueryParameters {
  hash: string;
  swarmKey: string;
  invitation: string;
  identityKey?: string;
  type: string;
}

/**
 * Describes an issued invitation.
 *
 * Can be serialized to protobuf or JSON.
 * Invitations can be interactive or offline.
 *
 * This descriptor might also have a bundled secret for authentication in interactive mode.
 */
// TODO(burdon): Move to Client API (and/or remove).
export class InvitationWrapper {
  static decode(code: string): InvitationWrapper {
    const json = base62.decode(code).toString();
    return InvitationWrapper.fromQueryParameters(JSON.parse(json));
  }

  static encode(invitation: InvitationWrapper): string {
    const buffer = Buffer.from(JSON.stringify(invitation.toQueryParameters()));
    return base62.encode(buffer);
  }

  static fromQueryParameters(queryParameters: InvitationQueryParameters): InvitationWrapper {
    const { hash, swarmKey, invitation, identityKey, type } = queryParameters;
    const descriptor = new InvitationWrapper(
      parseInvitationType(type),
      PublicKey.from(swarmKey),
      PublicKey.bufferize(invitation),
      identityKey ? PublicKey.from(identityKey) : undefined
    );

    if (hash !== descriptor.hash) {
      throw new InvalidInvitationError();
    }

    return descriptor;
  }

  static fromProto(invitation: InvitationDescriptor): InvitationWrapper {
    assert(invitation.type !== undefined);
    assert(invitation.swarmKey, 'Missing swarm key');
    assert(invitation.invitation);

    return new InvitationWrapper(
      invitation.type,
      PublicKey.from(invitation.swarmKey),
      Buffer.from(invitation.invitation),
      invitation.identityKey ? PublicKey.from(invitation.identityKey) : undefined,
      invitation.secret ? Buffer.from(invitation.secret) : undefined
    );
  }

  constructor(
    public readonly type: InvitationDescriptor.Type,
    public readonly swarmKey: PublicKey,
    public readonly invitation: Uint8Array,
    public readonly identityKey?: PublicKey,
    public secret?: Uint8Array
  ) {
    assert(type !== undefined);
    assert(PublicKey.isPublicKey(swarmKey));
    assert(invitation instanceof Uint8Array);
    if (identityKey) {
      PublicKey.assertValidPublicKey(identityKey);
    }
    if (secret) {
      assert(secret instanceof Uint8Array);
    }
  }

  get hash() {
    const query = this.toQueryParameters();
    return query.hash;
  }

  toProto(): InvitationDescriptor {
    return {
      type: this.type,
      swarmKey: this.swarmKey.asUint8Array(),
      invitation: this.invitation,
      identityKey: this.identityKey?.asUint8Array(),
      secret: this.secret
    };
  }

  toQueryParameters(): InvitationQueryParameters {
    const query: Partial<InvitationQueryParameters> = {
      swarmKey: this.swarmKey.toHex(),
      invitation: PublicKey.stringify(this.invitation),
      type: stringifyInvitationType(this.type)
    };

    if (this.identityKey) {
      query.identityKey = this.identityKey.toHex();
    }

    query.hash = ripemd160(stableStringify(query));
    return query as InvitationQueryParameters;
  }
}

// TODO(burdon): Move to client API.
const parseInvitationType = (str: string): InvitationDescriptor.Type => {
  const type = parseInt(str);
  assert(
    type === InvitationDescriptor.Type.INTERACTIVE || type === InvitationDescriptor.Type.OFFLINE,
    'Invalid invitation type'
  );
  return type;
};

// TODO(burdon): Move to client API.
const stringifyInvitationType = (type: InvitationDescriptor.Type): string => type.toString();
