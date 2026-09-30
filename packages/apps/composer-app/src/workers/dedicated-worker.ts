//
// Copyright 2026 DXOS.org
//

import { PluginWorker } from '@dxos/app-framework/worker';
import { STORAGE_LOCK_KEY } from '@dxos/client/lock-key';

// Everything this worker serves comes from the plugins the tab lists in
// `runtime.client.workerPlugins` (see main.tsx): the client services, and Composer's observability.
PluginWorker.run({ storageLockKey: STORAGE_LOCK_KEY });
