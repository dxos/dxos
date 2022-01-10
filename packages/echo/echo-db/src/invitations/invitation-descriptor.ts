//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import stableStringify from 'json-stable-stringify';

import { keyToBuffer, keyToString, ripemd160, PublicKey } from '@dxos/crypto';
import { SwarmKey } from '@dxos/echo-protocol';

import { InvalidInvitationError } from '../errors';
import * as proto from '@dxos/echo-protocol'

export type InvitationDescriptorType = proto.InvitationDescriptor.Type;

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

/**
 * Describes an issued invitation.
 * 
 * Can be serialized to protobuf or JSON.
 * Invitations can be interactive or offline.
 * 
 * This descriptor might also have a bundled secret for authentication in interactive mode.
 */
export class InvitationDescriptor {
  static fromQueryParameters (queryParameters: InvitationQueryParameters): InvitationDescriptor {
    const { hash, swarmKey, invitation, identityKey, type } = queryParameters;

    const descriptor = new InvitationDescriptor(parseInvitationType(type), keyToBuffer(swarmKey),
      keyToBuffer(invitation), identityKey ? PublicKey.from(identityKey) : undefined);

    if (hash !== descriptor.hash) {
      throw new InvalidInvitationError();
    }

    return descriptor;
  }

  static fromProto (protoInvitation: proto.InvitationDescriptor): InvitationDescriptor {
    assert(protoInvitation.type, 'Invitation type not provided.');
    assert(protoInvitation.swarmKey, 'Invitation swarm key not provided.');
    assert(protoInvitation.invitation, 'Invitation not provided.');
    assert(protoInvitation.identityKey, 'Invitation identity key not provided.');
  
    return new InvitationDescriptor(
      protoInvitation.type,
      protoInvitation.swarmKey,
      Buffer.from(protoInvitation.invitation),
      PublicKey.from(protoInvitation.identityKey),
      protoInvitation.secret ? Buffer.from(protoInvitation.secret) : undefined,
    );
  }

  // TODO(dboreham): Switch back to private member variables since we have encapsulated this class everywhere.
  constructor (
    public readonly type: InvitationDescriptorType,
    public readonly swarmKey: SwarmKey,
    public readonly invitation: Buffer,
    public readonly identityKey?: PublicKey,
    public secret?: Buffer
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
      type: stringifyInvitationType(this.type),
    };

    if (this.identityKey) {
      query.identityKey = this.identityKey.toHex();
    }

    query.hash = ripemd160(stableStringify(query));

    return query as InvitationQueryParameters;
  }

  toProto (): proto.InvitationDescriptor {
    return {
      type: this.type,
      swarmKey: this.swarmKey,
      invitation: this.invitation,
      identityKey: this.identityKey?.asUint8Array(),
      secret: this.secret,
    }
  }
}

const parseInvitationType = (str: string): InvitationDescriptorType => {
  const type = parseInt(str);
  assert(type === 1 || type === 2, 'Invalid invitation type');
  return type;
}

const stringifyInvitationType = (type: InvitationDescriptorType): string => type.toString();
