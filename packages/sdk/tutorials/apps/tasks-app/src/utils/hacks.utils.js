//
// Copyright 2020 DXOS.org
//

// This file contains hacks and workarounds around the dxos stack.
// It should be fixed in the underlying stack - SDK, ECHO, HALO.
// But is hacked around temporarily to allow running the app and testing.

// TODO(burdon): Error: assert(this._itemManager) [not open?]
// TODO(burdon): This obviously required issue is sidestepped in appkit (see PartyList).
// Tracked at https://github.com/dxos/echo/issues/311

export const getPartyTitle = (party) => {
  try {
    return party.getProperty('title');
  } catch (ex) {
    console.warn(ex);
    return 'Loading...';
  }
};
