//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { Icon, Input, Select, Toolbar } from '@dxos/react-ui';
import { safeParseInt } from '@dxos/util';

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
  const [count, setCount] = useState(10);
  const [type, setType] = useState<string>(types?.[0] ?? '');
  const [filter, setFilter] = useState<string>();
  useEffect(() => onTypeChange?.(type), [type]);
  useEffect(() => onFilterChange?.(filter), [filter]);
  useEffect(() => onViewChange?.(view), [view]);

  return (
    <Toolbar.Root>
      <Toolbar.IconButton icon='ph--plus--regular' iconOnly label='Create objects' onClick={() => onAdd(count)} />
      <Input.Root>
        <Input.TextInput
          classNames='max-is-16 text-right'
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
              <Select.Arrow />
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
            <Icon icon='ph--table--regular' size={5} />
          </Toolbar.ToggleGroupItem>
          <Toolbar.ToggleGroupItem value='list'>
            <Icon icon='ph--list--regular' size={5} />
          </Toolbar.ToggleGroupItem>
          <Toolbar.ToggleGroupItem value='debug'>
            <Icon icon='ph--list-magnifying-glass--regular' size={5} />
          </Toolbar.ToggleGroupItem>
        </Toolbar.ToggleGroup>
      )}
    </Toolbar.Root>
  );
};
