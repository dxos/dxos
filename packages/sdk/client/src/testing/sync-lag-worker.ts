//
// Copyright 2026 DXOS.org
//

import { layerMemory } from '@dxos/sql-sqlite/platform';

import { runDedicatedWorker } from '../services/dedicated/dedicated-worker.ts';

// In-memory storage so a run never sees the identity a previous run left in OPFS.
runDedicatedWorker({ sqliteLayer: layerMemory });
