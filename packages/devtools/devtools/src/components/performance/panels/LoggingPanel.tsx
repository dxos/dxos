//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useEffect, useState } from 'react';

import { type LogConfig, type LogEntry, LogLevel, log, shortLevelName, shouldLog } from '@dxos/log';
import { IconButton, Input, Toolbar } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { type CustomPanelProps, Panel } from '../Panel';

export const LoggingPanel = ({ maxLines = 100, ...props }: CustomPanelProps<{ maxLines?: number }>) => {
  const [text, setText] = useState('intent-dispatcher:DEBUG');
  const [active, setActive] = useState(false);
  const [entries, setEntries] = useState<LogEntry[]>([]);

  useEffect(() => {
    if (!active) {
      return;
    }

    log.config({ filter: text });
    const dispose = log.addProcessor((config: LogConfig, entry: LogEntry) => {
      if (shouldLog(entry, config.filters)) {
        setEntries((entries) => [...entries, entry].slice(0, maxLines));
      }
    });

    return () => {
      dispose();
    };
  }, [active, text, maxLines]);

  const handleClear = useCallback(() => {
    setEntries([]);
  }, []);

  return (
    <Panel {...props} icon='ph--list--regular' title={'Logging'} maxHeight={0}>
      <Toolbar.Root classNames='gap-2'>
        <Input.Root>
          <Input.TextInput placeholder='Filter' value={text} onChange={(ev) => setText(ev.target.value)} />
        </Input.Root>
        <Input.Root>
          <Input.Switch checked={active} onCheckedChange={setActive} />
        </Input.Root>
        <Toolbar.IconButton icon='ph--x--regular' iconOnly label='Clear' onClick={handleClear} />
      </Toolbar.Root>
      <div className='flex flex-col max-bs-[240px] overflow-y-auto text-xs'>
        {entries.map((entry, index) => (
          <div key={index} className='group pli-1 grid grid-cols-[1rem_1fr_1fr_min-content] items-center'>
            <div
              className={mx(
                entry.level > LogLevel.WARN
                  ? 'text-errorText'
                  : entry.level > LogLevel.INFO
                    ? 'text-warningText'
                    : entry.level > LogLevel.VERBOSE
                      ? 'text-infoText'
                      : 'text-successText',
              )}
            >
              {shortLevelName[entry.level]}
            </div>
            <div className='truncate text-subdued'>{entry.meta?.F?.split('/').pop()?.split('.')[0]}</div>
            <div className='truncate cursor-pointer' title={entry.message}>
              {entry.message}
            </div>
            <IconButton
              icon='ph--clipboard--regular'
              iconOnly
              label='Copy'
              variant='ghost'
              classNames='cursor-pointer opacity-50 group-hover:opacity-100'
              onClick={() => navigator.clipboard.writeText(JSON.stringify(entry, null, 2))}
            />
          </div>
        ))}
      </div>
    </Panel>
  );
};
