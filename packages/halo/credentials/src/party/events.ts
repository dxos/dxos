//
// Copyright 2019 DXOS.org
//

// TODO(burdon): Move to protobuf and replace use of string literals.
export enum PartyEventType {
  ADMIT_KEY = 'admit:key',
  ADMIT_FEED = 'admit:feed',
  UPDATE_KEY = 'update:key'
}

export const PartyEvents = Object.keys(PartyEventType);
