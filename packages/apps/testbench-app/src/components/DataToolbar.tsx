//
// Copyright 2024 DXOS.org
//

import { Plus, Table, List, ListMagnifyingGlass } from '@phosphor-icons/react';
import React, { useEffect, useState } from 'react';

import { Input, Select, Toolbar } from '@dxos/react-ui';
import { getSize } from '@dxos/react-ui-theme';

export type DataView = 'table' | 'list' | 'debug';

export type DataToolbarProps = {
  types?: string[];
  onAdd: (count: number) => void;
  onTypeChange?: (type: string | undefined) => void;
  onFilterChange?: (filter: string | undefined) => void;
  onViewChange?: (view: DataView | undefined) => void;
};

export const DataToolbar = ({ types, onAdd, onTypeChange, onFilterChange, onViewChange }: DataToolbarProps) => {
  const [view, setView] = useState<DataView>('table');
  const [count, setCount] = useState(3);
  const [type, setType] = useState<string>(types?.[0] ?? '');
  const [filter, setFilter] = useState<string>();
  useEffect(() => {
    onTypeChange?.(type);
  }, [type]);
  useEffect(() => {
    onFilterChange?.(filter);
  }, [filter]);
  useEffect(() => {
    onViewChange?.(view);
  }, [view]);

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
      {!!types?.length && (
        <Select.Root value={type} onValueChange={(type) => setType(type)}>
          <Toolbar.Button asChild>
            <Select.TriggerButton />
          </Toolbar.Button>
          <Select.Portal>
            <Select.Content>
              <Select.Viewport>
                {types.map((type) => (
                  <Select.Option key={type} value={type}>
                    <span className='font-mono'>{type}</span>
                  </Select.Option>
                ))}
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      )}
      {onFilterChange && (
        <Input.Root>
          <Input.TextInput
            placeholder='Filter objects...'
            value={filter ?? ''}
            onChange={(event) => setFilter(event.target.value)}
          />
        </Input.Root>
      )}
      {onViewChange && (
        <Toolbar.ToggleGroup type='single' value={view} onValueChange={(value) => setView(value as DataView)}>
          <Toolbar.ToggleGroupItem value='table'>
            <Table className={getSize(5)} />
          </Toolbar.ToggleGroupItem>
          <Toolbar.ToggleGroupItem value='list'>
            <List className={getSize(5)} />
          </Toolbar.ToggleGroupItem>
          <Toolbar.ToggleGroupItem value='debug'>
            <ListMagnifyingGlass className={getSize(5)} />
          </Toolbar.ToggleGroupItem>
        </Toolbar.ToggleGroup>
      )}
    </Toolbar.Root>
  );
};

const safeParseInt = (str: string): number | undefined => {
  const value = parseInt(str);
  return isNaN(value) ? undefined : value;
};
