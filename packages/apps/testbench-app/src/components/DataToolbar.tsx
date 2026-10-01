//
// Copyright 2024 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { Button, Field, Icon, Input, Select, ToggleGroup, Toolbar } from '@dxos/react-ui';
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
      <Button icon='ph--plus--regular' iconOnly label='Create objects' onClick={() => onAdd(count)} />
      <Field.Root>
        <Input
          classNames='max-w-16 text-right'
          value={count}
          onChange={(event) => setCount(safeParseInt(event.target.value) ?? count)}
        />
      </Field.Root>
      {!!types?.length && (
        <Select.Root value={type} onValueChange={(type) => setType(type)}>
          <Button asChild>
            <Select.Trigger />
          </Button>
          <Select.Content>
            {types.map((type) => (
              <Select.Item key={type} value={type}>
                <span className='font-mono'>{type}</span>
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
      )}
      {onFilterChange && (
        <Field.Root>
          <Input
            placeholder='Filter objects...'
            value={filter ?? ''}
            onChange={(event) => setFilter(event.target.value)}
          />
        </Field.Root>
      )}
      {onViewChange && (
        <Toolbar.ToggleGroup type='single' value={view} onValueChange={(value) => setView(value as DataView)}>
          <ToggleGroup.Item value='table'>
            <Icon icon='ph--table--regular' />
          </ToggleGroup.Item>
          <ToggleGroup.Item value='list'>
            <Icon icon='ph--list--regular' />
          </ToggleGroup.Item>
          <ToggleGroup.Item value='debug'>
            <Icon icon='ph--list-magnifying-glass--regular' />
          </ToggleGroup.Item>
        </Toolbar.ToggleGroup>
      )}
    </Toolbar.Root>
  );
};
