//
// Copyright 2023 DXOS.org
//

import get from 'lodash.get';
import update from 'lodash.update';

import { type Space } from '@dxos/react-client/echo';

// todo(thure): Why is the value that gets set in `ghBind` always undefined by the time this is called?
const ghMatch = (space: Space, identityHex: string, id: string): boolean => {
  const [ghOwner, ghRepo, ..._ghEtc] = id.split('/');
  return get(space.properties, ['members', identityHex, 'github', 'repos'], []).includes(`${ghOwner}/${ghRepo}`);
};

export const matchSpace = (space: Space, identityHex: string, source?: string, id?: string) => {
  if (!id) {
    return false;
  }
  switch (source) {
    case 'github.com':
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
  return space.properties.members?.[identityHex]?.github?.repos ?? [];
};

export const bindSpace = (space: Space, identityHex: string, source: string, id: string): string[] => {
  switch (source) {
    case 'github.com':
      return ghBind(space, identityHex, id);
    default:
      return [];
  }
};
const ghUnbind = (space: Space, identityHex: string, id: string): string[] => {
  const [ghOwner, ghRepo, ..._ghEtc] = id.split('/');
  update(space.properties, ['members', identityHex, 'github', 'repos'], (ghBindings) => {
    const index = ghBindings.indexOf(`${ghOwner}/${ghRepo}`);
    if (index >= 0) {
      const result = [...ghBindings];
      result.splice(index, 1);
      return result;
    } else {
      return ghBindings;
    }
  });
  return space.properties.members?.[identityHex]?.github?.repos ?? [];
};

export const unbindSpace = (space: Space, identityHex: string, source: string, id: string): string[] => {
  switch (source) {
    case 'github.com':
      return ghUnbind(space, identityHex, id);
    default:
      return [];
  }
};

const ghDisplayName = (id: string): string => {
  const [ghOwner, ghRepo, ghResource, ...etc] = id.split('/');
  switch (ghResource) {
    case 'issues':
      return `${ghOwner}/${ghRepo} #${etc[0]}`;
    default:
      return `${ghOwner}/${ghRepo} ${[ghResource, ...etc].join('/')}`;
  }
};

export const displayName = (source: string, id: string): string => {
  switch (source) {
    case 'github.com':
      return ghDisplayName(id);
    default:
      return id;
  }
};
