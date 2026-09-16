//
// Copyright 2025 DXOS.org
//

import { Hook } from '@dxos/effect';

import { type WorkerSession } from './worker-runtime.ts';

/** A tab session has closed, whether by the tab, the client, or its liveness lock releasing. */
export const SessionClosed = Hook.make<{ session: WorkerSession }>()('client-services/worker/SessionClosed');
