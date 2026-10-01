//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { Next } from '@dxos/react-ui/next';
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
    <Next.Toolbar.Root>
      <Next.Button icon='ph--plus--regular' iconOnly label='Create objects' onClick={() => onAdd(count)} />
      <Next.Field.Root>
        <Next.Input
          classNames='max-w-16 text-right'
          value={count}
          onChange={(event) => setCount(safeParseInt(event.target.value) ?? count)}
        />
      </Next.Field.Root>
      {!!types?.length && (
        <Next.Select.Root value={type} onValueChange={(type) => setType(type)}>
          <Next.Button asChild>
            <Next.Select.Trigger />
          </Next.Button>
          <Next.Select.Content>
            {types.map((type) => (
              <Next.Select.Item key={type} value={type}>
                <span className='font-mono'>{type}</span>
              </Next.Select.Item>
            ))}
          </Next.Select.Content>
        </Next.Select.Root>
      )}
      {onFilterChange && (
        <Next.Field.Root>
          <Next.Input
            placeholder='Filter objects...'
            value={filter ?? ''}
            onChange={(event) => setFilter(event.target.value)}
          />
        </Next.Field.Root>
      )}
      {onViewChange && (
        <Next.Toolbar.ToggleGroup type='single' value={view} onValueChange={(value) => setView(value as DataView)}>
          <Next.ToggleGroup.Item value='table'>
            <Next.Icon icon='ph--table--regular' />
          </Next.ToggleGroup.Item>
          <Next.ToggleGroup.Item value='list'>
            <Next.Icon icon='ph--list--regular' />
          </Next.ToggleGroup.Item>
          <Next.ToggleGroup.Item value='debug'>
            <Next.Icon icon='ph--list-magnifying-glass--regular' />
          </Next.ToggleGroup.Item>
        </Next.Toolbar.ToggleGroup>
      )}
    </Next.Toolbar.Root>
  );
};
