//
// Copyright 2019 DXOS.org
//

// TODO(burdon): Move to protobuf and replace use of string literals.
export enum EventType {
  UPDATE_IDENTITY = 'update:identityinfo'
}

export const IdentityEvents = [
  EventType.UPDATE_IDENTITY
];
