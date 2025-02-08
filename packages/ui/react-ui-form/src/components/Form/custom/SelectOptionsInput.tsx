//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type SelectOption } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/keys';
import { IconButton, Input } from '@dxos/react-ui';
import { List } from '@dxos/react-ui-list';
import { ghostHover, mx } from '@dxos/react-ui-theme';

// import { translationKey } from '../../../translations';
import { InputHeader, type InputProps } from '../Input';

export const SelectOptionInput = ({
  type,
  label,
  disabled,
  getStatus,
  getValue,
  onValueChange,
  onBlur,
}: InputProps) => {
  const [selected, setSelectedId] = React.useState<string | null>(null);
  // const { t } = useTranslation(translationKey);
  const { status, error } = getStatus();
  const options = getValue<SelectOption[] | undefined>();

  React.useEffect(() => {
    if (options === undefined) {
      onValueChange(type, []);
    }
  }, [options, onValueChange, type]);

  const handleAdd = React.useCallback(() => {
    const newOption = { id: PublicKey.random().truncate(), title: 'New Option', color: 'gray' };
    onValueChange(type, [...(options ?? []), newOption]);
  }, [options, type, onValueChange]);

  const handleDelete = React.useCallback(
    (id: string) => {
      const newOptions = options?.filter((option) => option.id !== id) ?? [];
      onValueChange(type, newOptions);
      setSelectedId(null);
    },
    [options, type, onValueChange],
  );

  const handleMove = React.useCallback(
    (from: number, to: number) => {
      if (!options) {
        return;
      }

      const newOptions = [...options];
      const [removed] = newOptions.splice(from, 1);
      newOptions.splice(to, 0, removed);
      onValueChange(type, newOptions);
    },
    [options, type, onValueChange],
  );

  const handleClick = React.useCallback((id: string) => {
    setSelectedId((current) => (current === id ? null : id));
  }, []);

  return (
    <Input.Root validationValence={status}>
      <InputHeader error={error}>
        <Input.Label>{label}</Input.Label>
      </InputHeader>
      <div role='none'>
        {options && (
          <List.Root items={options} isItem={(item) => true} onMove={handleMove}>
            {({ items }) => (
              <div role='list' className='w-full overflow-auto'>
                {items?.map((item) => (
                  <List.Item
                    key={item.id}
                    item={item}
                    classNames={mx(
                      'grid grid-cols-[32px_1fr_32px] min-bs-[2.5rem]',
                      'cursor-pointer',
                      ghostHover,
                      selected === item.id && 'bg-hoverSurface',
                    )}
                  >
                    <List.ItemDragHandle />
                    <List.ItemTitle onClick={() => handleClick(item.id)}>{item.title}</List.ItemTitle>
                    <List.ItemDeleteButton onClick={() => handleDelete(item.id)} />
                  </List.Item>
                ))}
              </div>
            )}
          </List.Root>
        )}
        {!selected && (
          <div role='none' className='flex p-2 justify-center'>
            <IconButton icon='ph--plus--regular' label='Add option' onClick={handleAdd} disabled={disabled} />
          </div>
        )}
        {selected && (
          <div role='none'>
            <Input.Root>
              <Input.Label>Label</Input.Label>
              <Input.TextInput
                value={options?.find((o) => o.id === selected)?.title ?? ''}
                onChange={(e) => {
                  const newOptions = options?.map((o) => (o.id === selected ? { ...o, title: e.target.value } : o));
                  onValueChange(type, newOptions ?? []);
                }}
              />
            </Input.Root>
          </div>
        )}
      </div>
    </Input.Root>
  );
};
