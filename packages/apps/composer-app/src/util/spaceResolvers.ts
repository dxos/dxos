//
// Copyright 2023 DXOS.org
//

import get from 'lodash.get';
import update from 'lodash.update';

import { Space } from '@dxos/client';

// todo(thure): Why is the value that gets set in `ghBind` always undefined by the time this is called?
const ghMatch = (space: Space, identityHex: string, id: string): boolean => {
  const [ghOwner, ghRepo, ..._ghEtc] = id.split('/');
  console.log(
    '[gh match]',
    ['members', identityHex, 'github', 'repos'],
    get(space.properties, ['members', identityHex, 'github', 'repos'])
  );
  return get(space.properties, ['members', identityHex, 'github', 'repos'], []).includes(`${ghOwner}/${ghRepo}`);
};

export const matchSpace = (space: Space, identityHex: string, source?: string, id?: string) => {
  if (!id) {
    return false;
  }
  switch (source) {
    case 'com.github':
      return ghMatch(space, identityHex, id);
    default:
      return false;
  }
};

// todo(thure): Why does the new space.properties value not propagate?
const ghBind = (space: Space, identityHex: string, id: string): string[] => {
  const [ghOwner, ghRepo, ..._ghEtc] = id.split('/');
  update(space.properties, ['members', identityHex, 'github', 'repos'], (ghBindings) => {
    return [...(ghBindings ?? []), `${ghOwner}/${ghRepo}`];
  });
  console.log('[updated repos]', space.properties.members?.[identityHex]?.github?.repos);
  return space.properties.members?.[identityHex]?.github?.repos ?? [];
};

export const bindSpace = (space: Space, identityHex: string, source: string, id: string): string[] => {
  switch (source) {
    case 'com.github':
      return ghBind(space, identityHex, id);
    default:
      return [];
  }
};
