//
// Copyright 2025 DXOS.org
//

import { Event } from '@dxos/effect';

import { type WorkerSession } from './worker-runtime.ts';

/** A tab session has closed, whether by the tab, the client, or its liveness lock releasing. */
export const SessionClosed = Event.make<{ session: WorkerSession }>()('client-services/worker/SessionClosed');
