//
// Copyright 2024 DXOS.org
//

import { Plus } from '@phosphor-icons/react';
import React, { useEffect, useState } from 'react';

import { Input, Toolbar } from '@dxos/react-ui';

export type DataToolbarProps = {
  onAdd: (count: number) => void;
  onFilterChange?: (filter: string | undefined) => void;
  onDebugChange?: (debug: boolean) => void;
};

export const DataToolbar = ({ onAdd, onFilterChange, onDebugChange }: DataToolbarProps) => {
  const [debug, setDebug] = useState(false);
  const [count, setCount] = useState(3);
  const [filter, setFilter] = useState<string>();
  useEffect(() => {
    onFilterChange?.(filter);
  }, [filter]);
  useEffect(() => {
    onDebugChange?.(debug);
  }, [debug]);

  return (
    <Toolbar.Root classNames='p-1'>
      <Toolbar.Button onClick={() => onAdd(count)} title='Create objects.'>
        <Plus />
      </Toolbar.Button>
      <Input.Root>
        <Input.TextInput
          classNames='max-w-16 text-right'
          value={count}
          onChange={(event) => setCount(safeParseInt(event.target.value) ?? count)}
        />
      </Input.Root>
      {onFilterChange && (
        <Input.Root>
          <Input.TextInput
            placeholder='Filter objects...'
            value={filter ?? ''}
            onChange={(event) => setFilter(event.target.value)}
          />
        </Input.Root>
      )}
      {onDebugChange && (
        <Input.Root>
          <Input.Switch checked={debug} onCheckedChange={(value) => setDebug(value)} title='Debug' />
        </Input.Root>
      )}
    </Toolbar.Root>
  );
};

const safeParseInt = (str: string): number | undefined => {
  const value = parseInt(str);
  return isNaN(value) ? undefined : value;
};
