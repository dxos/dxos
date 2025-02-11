//
// Copyright 2024 DXOS.org
//

import React, { useCallback, useEffect } from 'react';

import { type SelectOption } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/keys';
import { ChromaticPalette, IconButton, Input, Tag, Toolbar } from '@dxos/react-ui';
import { List } from '@dxos/react-ui-list';
import { HuePickerBlock, HuePickerToolbarButton } from '@dxos/react-ui-pickers';
import { hueTokenThemes, mx } from '@dxos/react-ui-theme';

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

  // Initialization.
  useEffect(() => {
    if (options === undefined) {
      onValueChange(type, []);
    }
  }, [options, onValueChange, type]);

  const randomHue = () => {
    // Collect all the colors.
    const colors = new Set(options?.map((option) => option.color) ?? []);

    // Get keys as array.
    const hueKeys = Object.keys(hueTokenThemes) as Array<keyof typeof hueTokenThemes>;

    // Pick a random unused option from hueTokenThemes.
    const unusedHues = hueKeys.filter((hue) => !colors.has(hue));

    if (unusedHues.length > 0) {
      return unusedHues[Math.floor(Math.random() * unusedHues.length)];
    }

    // If they have all been used, pick a random one.
    return hueKeys[Math.floor(Math.random() * hueKeys.length)];
  };

  const handleAdd = useCallback(() => {
    const newOption = { id: PublicKey.random().truncate(), title: 'New Option', color: randomHue() };
    onValueChange(type, [...(options ?? []), newOption]);
  }, [options, type, onValueChange]);

  const handleDelete = useCallback(
    (id: string) => {
      const newOptions = options?.filter((option) => option.id !== id) ?? [];
      onValueChange(type, newOptions);
      setSelectedId(null);
    },
    [options, type, onValueChange],
  );

  const handleMove = useCallback(
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

  const handleClick = useCallback((id: string) => {
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
                  <div key={item.id}>
                    <List.Item
                      role='button'
                      item={item}
                      classNames={mx('p-1 plb-2', 'flex flex-col', 'cursor-pointer', 'hover:bg-hoverOverlay')}
                      aria-expanded={selected === item.id}
                    >
                      <div className='flex items-center'>
                        <List.ItemDragHandle />
                        <List.ItemTitle onClick={() => handleClick(item.id)} classNames='flex-1'>
                          <Tag palette={item.color as ChromaticPalette}>{item.title || '\u200b'}</Tag>
                        </List.ItemTitle>
                        <List.ItemDeleteButton onClick={() => handleDelete(item.id)} />
                      </div>
                      {selected === item.id && (
                        <div className='ml-[16px] mt-2 flex flex-col gap-1'>
                          {/* 16px to match drag handle width. */}
                          <Input.Root>
                            <Input.Label classNames='text-xs'>Label</Input.Label>
                            <Input.TextInput
                              value={item.title}
                              onChange={(e) => {
                                const newOptions = options?.map((o) =>
                                  o.id === item.id ? { ...o, title: e.target.value } : o,
                                );
                                onValueChange(type, newOptions ?? []);
                              }}
                            />
                          </Input.Root>
                          <Input.Root>
                            <Input.Label classNames='text-xs'>Color</Input.Label>
                            <Toolbar.Root>
                              <HuePickerToolbarButton
                                hue={item.color}
                                onChangeHue={(hue) => {
                                  const newOptions = options?.map((o) => (o.id === item.id ? { ...o, color: hue } : o));
                                  onValueChange(type, newOptions ?? []);
                                }}
                              />
                            </Toolbar.Root>
                          </Input.Root>
                        </div>
                      )}
                    </List.Item>
                  </div>
                ))}
              </div>
            )}
          </List.Root>
        )}
        <div role='none' className='flex p-2 justify-center'>
          <IconButton icon='ph--plus--regular' label='Add option' onClick={handleAdd} disabled={disabled} />
        </div>
      </div>
    </Input.Root>
  );
};
