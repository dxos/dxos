//
// Copyright 2023 DXOS.org
//

import { PublicKey, PublicKeyLike } from '@dxos/keys';
import { EchoDatabase, Space, SpaceState } from '@dxos/react-client/echo';

import { SPACE_PLUGIN, SPACE_PLUGIN_SHORT_ID, SpaceNode } from './types';

export const isSpace = (data: unknown): data is Space =>
  data && typeof data === 'object'
    ? 'key' in data && data.key instanceof PublicKey && 'db' in data && data.db instanceof EchoDatabase
    : false;

export const getSpaceId = (spaceKey: PublicKeyLike) => {
  if (spaceKey instanceof PublicKey) {
    spaceKey = spaceKey.toHex();
  }

  return `${SPACE_PLUGIN_SHORT_ID}/${spaceKey}`;
};

export const getSpaceDisplayName = (space: Space): string | [string, { ns: string }] => {
  const disabled = space.state.get() !== SpaceState.READY;
  return (space.properties.name?.length ?? 0) > 0
    ? space.properties.name
    : disabled
    ? ['loading space title', { ns: SPACE_PLUGIN }]
    : ['untitled space title', { ns: SPACE_PLUGIN }];
};

export const isSpaceNode = (data: unknown): data is SpaceNode => {
  return data && typeof data === 'object'
    ? 'params' in data && (data.params && typeof data.params === 'object' ? 'spaceKey' in data.params : false)
    : false;
};
