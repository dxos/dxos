//
// Copyright 2025 DXOS.org
//

import { type DataType } from '@dxos/schema';

export const getActorId = (actor: DataType.Actor) =>
  actor.identityDid || actor.identityKey || actor.email || actor.name || '';
