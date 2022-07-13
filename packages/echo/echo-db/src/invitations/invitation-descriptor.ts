//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import base from 'base-x';
import stableStringify from 'json-stable-stringify';

import { keyToBuffer, keyToString, ripemd160 } from '@dxos/crypto';
import { SwarmKey } from '@dxos/echo-protocol';
import * as proto from '@dxos/echo-protocol';
import { PublicKey } from '@dxos/protocols';

import { InvalidInvitationError } from '../packlets/errors';

// Re-exporting type enum from protobuf definitions.
export import InvitationDescriptorType = proto.InvitationDescriptor.Type;

// Encode with only alpha-numeric characters.
const base62 = base('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');

// Workaround for swc not properly handling namespace re-exports.
// eslint-disable-next-line unused-imports/no-unused-vars
const ___WORKAROUND = proto;

/**
 * A serialized version of InvitationDescriptor that's suitable to be encoded as an URL query string.
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

    return new InvitationDescriptor(
      protoInvitation.type,
      protoInvitation.swarmKey,
      Buffer.from(protoInvitation.invitation),
      protoInvitation.identityKey ? PublicKey.from(protoInvitation.identityKey) : undefined,
      protoInvitation.secret ? Buffer.from(protoInvitation.secret) : undefined
    );
  }

  static decode (code: string): InvitationDescriptor {
    const json = base62.decode(code).toString();
    return InvitationDescriptor.fromQueryParameters(JSON.parse(json));
  }

  // TODO(dboreham): Switch back to private member variables since we have encapsulated this class everywhere.
  constructor (
    public readonly type: InvitationDescriptorType,
    public readonly swarmKey: SwarmKey,
    public readonly invitation: Uint8Array,
    public readonly identityKey?: PublicKey,
    public secret?: Uint8Array
  ) {
    assert(type);
    assert(swarmKey instanceof Uint8Array);
    assert(invitation instanceof Uint8Array);
    if (identityKey) {
      PublicKey.assertValidPublicKey(identityKey);
    }
    if (secret) {
      assert(secret instanceof Uint8Array);
    }
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
      type: stringifyInvitationType(this.type)
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
      secret: this.secret
    };
  }

  encode (): string {
    const buffer = Buffer.from(JSON.stringify(this.toQueryParameters()));
    return base62.encode(buffer);
  }
}

const parseInvitationType = (str: string): InvitationDescriptorType => {
  const type = parseInt(str);
  assert(type === 1 || type === 2, 'Invalid invitation type');
  return type;
};

const stringifyInvitationType = (type: InvitationDescriptorType): string => type.toString();
