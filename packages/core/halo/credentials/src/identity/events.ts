//
// Copyright 2019 DXOS.org
//

// TODO(burdon): Move to protobuf and replace use of string literals.
export enum IdentityEventType {
  UPDATE_IDENTITY = 'update:identityinfo'
}

export const IdentityEvents = Object.values(IdentityEventType);
