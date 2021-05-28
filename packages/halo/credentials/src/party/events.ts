//
// Copyright 2019 DXOS.org
//

// TODO(burdon): Move to protobuf and replace use of string literals.
export enum EventType {
  ADMIT_KEY = 'admit:key',
  ADMIT_FEED = 'admit:feed',
  UPDATE_KEY = 'update:key'
}

export const PartyEvents = [
  EventType.ADMIT_KEY,
  EventType.ADMIT_FEED,
  EventType.UPDATE_KEY
];
