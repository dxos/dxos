//
// Copyright 2025 DXOS.org
//

import React, { type FC, useMemo } from 'react';

import { type TraceEvent } from '@dxos/functions-runtime';

type LogPanelProps = {
  objects?: TraceEvent[];
};

export const LogPanel: FC<LogPanelProps> = ({ objects }) => {
  const rows = useMemo(() => {
    if (!objects?.length) {
      return [];
    }

    const safeStringify = (value: any) => {
      try {
        if (value == null) {
          return '';
        }
        const seen = new WeakSet();
        return JSON.stringify(
          value,
          (key, val) => {
            if (typeof val === 'object' && val !== null) {
              if (seen.has(val)) {
                return '[Circular]';
              }
              seen.add(val);
            }
            return val;
          },
          2,
        );
      } catch {
        return '[Unserializable]';
      }
    };

    return objects.flatMap((event) =>
      event.logs.map((log, idx) => ({
        id: `${event.id}-${idx}`,
        time: new Date(log.timestamp),
        level: log.level,
        message: log.message,
        context: safeStringify(log.context),
      })),
    );
  }, [objects]);

  return (
    <div className='flex grow min-bs-0 min-is-0 is-full bs-full overflow-auto'>
      <table className='table-fixed min-w-full text-xs border-collapse'>
        <thead className='sticky top-0 z-10'>
          <tr>
            <th className='text-left px-2 py-1 w-40 border border-separator'>Started</th>
            <th className='text-left px-2 py-1 w-24 border border-separator'>Level</th>
            <th className='text-left px-2 py-1 w-80 border border-separator'>Message</th>
            <th className='text-left px-2 py-1 border border-separator'>Context</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const level = String(row.level).toUpperCase();

            return (
              <tr key={row.id} className='align-top'>
                <td className='px-2 py-1 whitespace-nowrap border border-separator'>{row.time.toLocaleString()}</td>
                <td className='px-2 py-1 font-mono border border-separator'>{level}</td>
                <td className='px-2 py-1 truncate max-w-[20rem] border border-separator'>{row.message}</td>
                <td className='px-2 py-1 font-mono text-[10px] whitespace-pre-wrap break-words border border-separator'>
                  {row.context}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
