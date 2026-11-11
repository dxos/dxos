//
import { type Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { type SpaceId } from '@dxos/keys';
// Copyright 2026 DXOS.org
//


/** Resolves once `client` lists the space, which an accepted invitation adds a moment later. */
export const listed = (client: Client, spaceId: SpaceId): Promise<Space> =>
  new Promise((resolve) => {
    const space = client.spaces.get(spaceId);
    if (space) {
      resolve(space);
      return;
    }
    const subscription = client.spaces.subscribe(() => {
      const space = client.spaces.get(spaceId);
      if (space) {
        subscription.unsubscribe();
        resolve(space);
      }
    });
  });

