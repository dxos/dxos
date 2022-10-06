//
// Copyright 2022 DXOS.org
//

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

/** @jsx h */
import { h } from 'https://esm.sh/preact';

import { Log } from '../common/types.ts';
import { LogTable } from './LogTable.tsx';

// TODO(burdon): Create selector for Deck sections.

export const Deck = ({
  logs,
  compact = false
}: {
  logs: Log[]
  compact: boolean
}) => {
  return (
    <div>
      {logs.map((log, i) => (
        <div key={i}>
          {log.label && (
            <h3 style={{
              padding: '8px 8px',
              margin: i === 0 ? 0 : '16px 0 0 0',
              backgroundColor: 'darkseagreen',
              fontFamily: 'monospace'
            }}>
              {log.label}
            </h3>
          )}
          <LogTable log={log} compact={compact} />
        </div>
      ))}
    </div>
  );
};
