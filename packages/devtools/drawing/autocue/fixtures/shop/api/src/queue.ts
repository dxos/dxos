//
// Copyright 2026 DXOS.org
//

import { Queue } from 'bullmq';

// Jobs live in Redis; the worker consumes them.
export const emails = new Queue('emails', { connection: { url: process.env.REDIS_URL } });
