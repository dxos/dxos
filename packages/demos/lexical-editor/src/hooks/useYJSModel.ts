//
// Copyright 2021 DXOS.org
//

// TODO(burdon): Factor out hook and create unit test for main replicator.
// NOTE: This file is originally from @dxos/editor: src/hooks/useYJSModel.ts.

import { useMemo } from 'react';
import { Doc } from 'yjs';

import { Replicator, SyncModel } from './replicator';

export const useYJSModel = (replicator: Replicator, id: string, doc?: Doc): SyncModel => {
  const peer = useMemo(() => replicator.createPeer(id, doc), [id, doc]);
  return peer.model;
};
