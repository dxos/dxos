//
// Copyright 2026 DXOS.org
//

import pg from 'pg';

export const db = new pg.Pool({ connectionString: process.env.DATABASE_URL });
