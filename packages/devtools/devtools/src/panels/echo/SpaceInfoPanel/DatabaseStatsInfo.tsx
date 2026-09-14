//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useState } from 'react';

import type { Space } from '@dxos/client/echo';
import type { Database } from '@dxos/echo';
import { log } from '@dxos/log';

import { JsonView } from '../../../components/index.ts';

interface DatabaseStatsInfoProps {
  space: Space;
}

/**
 * Storage census for the space. Unlike sync state there is no subscription — `db.stats()` walks the
 * space's documents on the host — so it is polled, and slowly.
 */
export const DatabaseStatsInfo = ({ space }: DatabaseStatsInfoProps) => {
  const [stats, setStats] = useState<Database.DatabaseStats>();

  useEffect(() => {
    let cancelled = false;
    const update = () => {
      space.db
        .stats()
        .then((stats) => {
          if (!cancelled) {
            setStats(stats);
          }
        })
        .catch((err) => log.catch(err));
    };

    update();
    const interval = setInterval(update, 5_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [space]);

  return (
    <div className='p-2 text-sm'>
      <p className='text-base'>Database stats</p>
      <JsonView data={stats} />
    </div>
  );
};
