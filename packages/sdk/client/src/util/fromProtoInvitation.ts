//
// Copyright 2021 DXOS.org
//

import { PublicKey } from '@dxos/crypto';
import { InvitationDescriptor, InvitationDescriptorType } from '@dxos/echo-db';
import assert from 'assert';
import { InvitationDescriptor as ProtoInvitationDescriptor } from '../proto/gen/dxos/client';

export const fromProtoInvitationType = (protoType: ProtoInvitationDescriptor.Type): InvitationDescriptorType => {
  if (protoType === ProtoInvitationDescriptor.Type.INTERACTIVE) {
    return InvitationDescriptorType.INTERACTIVE
  }
  if (protoType === ProtoInvitationDescriptor.Type.OFFLINE_KEY) {
    return InvitationDescriptorType.OFFLINE_KEY
  }
  throw new Error(`Unsupported invitation type: ${protoType}`)
}

export const toProtoInvitationType = (type: InvitationDescriptorType): ProtoInvitationDescriptor.Type => {
  if (type === InvitationDescriptorType.INTERACTIVE) {
    return ProtoInvitationDescriptor.Type.INTERACTIVE
  }
  if (type === InvitationDescriptorType.OFFLINE_KEY) {
    return ProtoInvitationDescriptor.Type.OFFLINE_KEY
  }
  throw new Error(`Unsupported invitation type: ${type}`)
}

export const fromProtoInvitation = (protoInvitation: ProtoInvitationDescriptor): InvitationDescriptor => {
  assert(protoInvitation.type, 'Invitation type not provided.');
  assert(protoInvitation.swarmKey, 'Invitation swarm key not provided.');
  assert(protoInvitation.invitation, 'Invitation not provided.');
  assert(protoInvitation.identityKey, 'Invitation identity key not provided.');

  return new InvitationDescriptor(
    fromProtoInvitationType(protoInvitation.type),
    protoInvitation.swarmKey,
    Buffer.from(protoInvitation.invitation),
    PublicKey.from(protoInvitation.identityKey)
  );
}

export const toProtoInvitation = (invitation: InvitationDescriptor, secret: string): ProtoInvitationDescriptor => {
  return {
    type: toProtoInvitationType(invitation.type),
    swarmKey: invitation.swarmKey,
    invitation: invitation.invitation,
    identityKey: invitation.identityKey?.asUint8Array(),
    secret
  }
}
