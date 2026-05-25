//
// Copyright 2025 DXOS.org
//

import { type Actor } from '@dxos/types';

export const getActorId = (actor: Actor.Actor) => {
  return actor.identityDid || actor.identityKey || actor.email || actor.name || '';
};
