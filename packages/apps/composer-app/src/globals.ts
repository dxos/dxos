//
// Copyright 2023 DXOS.org
//

import { __COMPOSER_MIGRATIONS__ } from '@braneframe/types';
import { CreateEpochRequest } from '@dxos/client/halo';
import { Migrations } from '@dxos/migrations';
import type { Client } from '@dxos/react-client';
import { type Space } from '@dxos/react-client/echo';

import { appKey } from './constants';

Migrations.define(appKey, __COMPOSER_MIGRATIONS__);

/**
 * Fragment space content into separate automerge documents.
 */
const fragmentSpaceContent = async (space: Space) => {
  const client: Client = (window as any).dxos.client;
  if (client) {
    await client.services.services.SpacesService?.createEpoch({
      spaceKey: space.key,
      migration: CreateEpochRequest.Migration.FRAGMENT_AUTOMERGE_ROOT,
    });
  }
};

(window as any).composer = {
  fragmentSpaceContent,
};
