//
// Copyright 2025 DXOS.org
//

import React, { type FC, useMemo } from 'react';

import { Trace } from '@dxos/compute';

type LogPanelProps = {
  messages?: readonly Trace.Message[];
};

export const LogPanel: FC<LogPanelProps> = ({ messages }) => {
  const rows = useMemo(() => {
    if (!messages?.length) {
      return [];
    }

    return messages.flatMap((message, mIdx) =>
      message.events
        .filter((event) => Trace.isOfType(Trace.Log, event))
        .map((event, eIdx) => ({
          id: `${message.id}-${mIdx}-${eIdx}`,
          time: new Date(event.timestamp),
          level: event.data.level,
          message: event.data.message,
          context: safeStringify(event.data.context),
        })),
    );
  }, [messages]);

  return (
    <div className='dx-container flex overflow-auto'>
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
