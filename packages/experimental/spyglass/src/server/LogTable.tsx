//
// Copyright 2022 DXOS.org
//

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck

/** @jsx h */
import { h } from 'https://esm.sh/preact';

import { Log, Message } from '../common/types.ts';

// TODO(burdon): emotion and styled-components don't work.
// TODO(burdon): https://deno.land/manual@v1.26.0/jsx_dom/css
// TODO(burdon): https://preactjs.com/guide/v10/differences-to-react#features-exclusive-to-preactcompat

// TODO(burdon): Pretty print.
const JSONStringify = (data: any) => JSON.stringify(data);

export const LogTable = ({
  log,
  compact = false
}: {
  log: Log
  compact: boolean
}) => {
  const { messages } = log;
  if (!messages.length) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          padding: 8
        }}
      >
        EMPTY
      </div>
    );
  }

  return compact ? (
    <Compact log={log} />
  ) : (
    <Timeline log={log} />
  );
};

export const Compact = ({
  log
}: {
  log: Log
}) => {
  const { messages } = log;

  const keyMap = messages.reduce((map, { key, data }) => {
    let messages = map.get(key);
    if (!messages) {
      messages = [];
      map.set(key, messages);
    }

    messages.push(data);
    return map;
  }, new Map<string, Message[]>());

  const keys = Array.from(keyMap.entries());

  return (
    <div style={{
      display: 'flex',
      flex: 1
    }}>
      {keys.map(([id, messages]) => (
        <div
          key={id}
          style={{
            flex: 1,
            overflow: 'scroll'
          }}
        >
          <div style={{
            color: '#f5f5f5',
            backgroundColor: '#444',
            padding: '4px 8px',
            fontFamily: 'monospace'
          }}>
            {id}
          </div>
          <div>
            {messages.map((data, i) => (
              <div
                key={i}
                style={{
                  padding: '4px 8px'
                }}
              >
                {JSONStringify(data)}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export const Timeline = ({
  log
}: {
  log: Log
}) => {
  const { messages } = log;
  const keySet = messages.reduce((set, { key }) => {
    set.add(key);
    return set;
  }, new Set());

  const keys = Array.from(keySet.values());

  return (
    <table style={{
      width: '100%',
      tableLayout: 'fixed',
      borderSpacing: 0
    }}>
      <thead>
      <tr>
        {keys.map(id => (
          <td
            key={id}
            style={{
              padding: '4px 8px',
              color: '#f5f5f5',
              backgroundColor: '#444',
              fontFamily: 'monospace'
            }}
          >
            {id}
          </td>
        ))}
      </tr>
      {messages.map(({ key, data }, i) => (
        <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#f5f5f5' : '#fff' }}>
          {keys.map(id => (
            <td
              key={id}
              style={{ padding: '4px 8px' }}
            >
              {id === key ? JSONStringify(data) : ''}
            </td>
          ))}
        </tr>
      ))}
      </thead>
    </table>
  );
};
