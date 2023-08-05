//
// Copyright 2023 DXOS.org
//

import Table from 'ink-table';
import os from 'os';
import React, { useEffect, FC, useState } from 'react';

type Status = {
  // arch: string;
  // version: string;
  uptime: string;

  rss: string;
  heap_total: string;
  heap_used: string;
  external: string;

  // total: string;
  // free: string;
  loadavg: string;
};

/**
 * System info.
 */
export const SystemTable: FC<{ interval?: number }> = ({ interval = 1000 }) => {
  const [data, setData] = useState<Status[]>([]);
  useEffect(() => {
    const timer = setInterval(() => handleRefresh(), Math.max(100, interval));
    return () => clearInterval(timer);
  }, [interval]);

  enum Unit {
    K = 1024,
    S = 2000,
  }
  const size = (n: number, unit = Unit.K, len = 10) =>
    Math.round(n / unit)
      .toLocaleString()
      .padStart(len, ' ');

  const handleRefresh = () => {
    // TODO(burdon): https://www.npmjs.com/package/express-status-monitor
    // https://nodejs.org/api/process.html#process_process_memoryusage
    const { rss, heapTotal, heapUsed, external } = process.memoryUsage();
    setData([
      {
        // arch: os.arch(),
        // version: process.version,
        uptime: os.uptime().toLocaleString().padStart(10, ' '),

        rss: size(rss),
        heap_total: size(heapTotal),
        heap_used: size(heapUsed),
        external: size(external),

        // total: os.totalmem().toLocaleString().padStart(14, ' '),
        // free: os.freemem().toLocaleString().padStart(14, ' '),
        loadavg: os
          .loadavg()
          .map((n) => n.toFixed(2))
          .join('; '),
      },
    ]);
  };

  if (!data.length) {
    return null;
  }

  return <Table data={data} />;
};
