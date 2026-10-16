//
// Copyright 2026 DXOS.org
//

import { createClient } from 'redis';

export const cache = createClient({ url: process.env.REDIS_URL });
