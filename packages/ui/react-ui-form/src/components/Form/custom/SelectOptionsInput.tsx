//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type SelectOption } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/keys';
import { Input } from '@dxos/react-ui';
import { List } from '@dxos/react-ui-list';

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

  return (
    <Input.Root validationValence={status}>
      <InputHeader error={error}>
        <Input.Label>{label}</Input.Label>
      </InputHeader>
      <div className='flex flex-col'>
        <button onClick={handleAdd}>Add</button>
        {options && (
          <List.Root items={options} isItem={(item) => true} onMove={handleMove}>
            {({ items }) => (
              <div role='list' className='w-full overflow-auto'>
                {items?.map((item) => (
                  <List.Item
                    key={item.id}
                    item={item}
                    classNames='grid grid-cols-[32px_1fr_32px] min-bs-[2rem] rounded hover:bg-ghostHover'
                  >
                    <List.ItemDragHandle />
                    <List.ItemTitle>{item.title}</List.ItemTitle>
                    <List.ItemDeleteButton
                      onDelete={() => {
                        handleDelete(item.id);
                      }}
                    />
                  </List.Item>
                ))}
              </div>
            )}
          </List.Root>
        )}
      </div>
    </Input.Root>
  );
};
