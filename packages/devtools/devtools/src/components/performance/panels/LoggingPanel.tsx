//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useEffect, useState } from 'react';

import { type LogConfig, type LogEntry, LogLevel, log, shortLevelName, shouldLog } from '@dxos/log';
import { IconButton, Input, ScrollArea, Toolbar } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

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
      <ScrollArea.Root orientation='vertical' classNames='max-h-[240px]'>
        <ScrollArea.Viewport classNames='text-xs'>
          {entries.map((entry, index) => (
            <div key={index} className='group px-1 grid grid-cols-[1rem_1fr_1fr_min-content] items-center'>
              <div
                className={mx(
                  entry.level > LogLevel.WARN
                    ? 'text-error'
                    : entry.level > LogLevel.INFO
                      ? 'text-warning'
                      : entry.level > LogLevel.VERBOSE
                        ? 'text-info'
                        : 'text-success',
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
                size={4}
                label='Copy'
                variant='ghost'
                classNames='cursor-pointer opacity-50 group-hover:opacity-100'
                onClick={() => navigator.clipboard.writeText(JSON.stringify(entry, null, 2))}
              />
            </div>
          ))}
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    </Panel>
  );
};
