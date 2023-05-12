//
// Copyright 2023 DXOS.org
//

import get from 'lodash.get';
import update from 'lodash.update';

import { Space } from '@dxos/client';

const ghMatch = (space: Space, identityHex: string, id: string) => {
  const [ghOwner, ghRepo, ..._ghEtc] = id.split('/');
  return get<string[]>(space.properties.members, [identityHex, 'com.github', 'repos'], []).includes(
    `${ghOwner}/${ghRepo}`
  );
};

export const matchSpace = (space: Space, identityHex: string, source: string, id: string) => {
  switch (source) {
    case 'com.github':
      return ghMatch(space, identityHex, id);
    default:
      return false;
  }
};

const ghBind = (space: Space, identityHex: string, id: string) => {
  const [ghOwner, ghRepo, ..._ghEtc] = id.split('/');
  return update(space.properties.members, [identityHex, 'com.github', 'repos'], (ghBindings) => {
    return [...(ghBindings ?? []), `${ghOwner}/${ghRepo}`];
  });
};

export const bindSpace = (space: Space, identityHex: string, source: string, id: string) => {
  switch (source) {
    case 'com.github':
      return ghBind(space, identityHex, id);
    default:
      return false;
  }
};
