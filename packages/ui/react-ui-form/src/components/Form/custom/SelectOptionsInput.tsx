//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useEffect, useState, type ChangeEvent, useRef } from 'react';

import { type SelectOption } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/keys';
import { type ChromaticPalette, Icon, IconButton, Input, Tag, Toolbar, useTranslation } from '@dxos/react-ui';
import { List } from '@dxos/react-ui-list';
import { HuePickerToolbarButton } from '@dxos/react-ui-pickers';
import { hueTokenThemes, mx } from '@dxos/react-ui-theme';

import { translationKey } from '../../../translations';
import { InputHeader, type InputProps } from '../Input';

// TODO(ZaymonFC): Handle disabled.
export const SelectOptionInput = ({ type, label, disabled, getStatus, getValue, onValueChange }: InputProps) => {
  const [selected, setSelectedId] = useState<string | null>(null);
  const [isNewOption, setIsNewOption] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation(translationKey);
  const { status, error } = getStatus();
  const options = getValue<SelectOption[] | undefined>();

  // Initialization.
  useEffect(() => {
    if (options === undefined) {
      onValueChange(type, []);
    }
  }, [options, onValueChange, type]);

  const randomHue = () => {
    const usedHues = new Set(options?.map((option) => option.color) ?? []);
    const hueKeys = Object.keys(hueTokenThemes) as Array<keyof typeof hueTokenThemes>;

    // Pick a random unused option from hueTokenThemes.
    const unusedHues = hueKeys.filter((hue) => !usedHues.has(hue));
    if (unusedHues.length > 0) {
      return unusedHues[Math.floor(Math.random() * unusedHues.length)];
    }

    // If they have all been used, pick a random one.
    return hueKeys[Math.floor(Math.random() * hueKeys.length)];
  };

  const handleAdd = useCallback(() => {
    const newId = PublicKey.random().truncate();
    const newOption = { id: newId, title: '', color: randomHue() };
    onValueChange(type, [...(options ?? []), newOption]);
    setSelectedId(newId);
    setIsNewOption(true);
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

  const handleTitleChange = useCallback(
    (id: string) => (e: ChangeEvent<HTMLInputElement>) => {
      const newOptions = options?.map((o) => (o.id === id ? { ...o, title: e.target.value } : o));
      onValueChange(type, newOptions ?? []);
    },
    [options, type, onValueChange],
  );

  const handleKeyDown = useCallback(
    (id: string) => (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        setSelectedId(null);
      }
    },
    [],
  );

  // Color onChange
  const handleColorChange = useCallback(
    (id: string) => (hue: string) => {
      const newOptions = options?.map((o) => (o.id === id ? { ...o, color: hue } : o));
      onValueChange(type, newOptions ?? []);
    },
    [options, type, onValueChange],
  );

  useEffect(() => {
    if (selected && isNewOption && inputRef.current) {
      inputRef.current.focus();
      setIsNewOption(false);
    }
  }, [selected, isNewOption]);

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
                          {/* TODO(ZaymonFC): Move spacer into Tag component. */}
                          <Tag palette={item.color as ChromaticPalette}>{item.title || '\u200b'}</Tag>
                        </List.ItemTitle>
                        <Icon
                          icon={selected === item.id ? 'ph--caret-down--regular' : 'ph--caret-right--regular'}
                          onClick={() => handleClick(item.id)}
                        />
                      </div>
                      {selected === item.id && (
                        <div className='ml-[16px] mt-2 flex flex-col gap-1'>
                          {/* 16px to match drag handle width. */}
                          <Input.Label classNames='text-xs'>{t('select option label')}</Input.Label>
                          <div className='flex flex-row items-center gap-1'>
                            <Input.TextInput
                              placeholder={t('select option label placeholder')}
                              ref={selected === item.id ? inputRef : undefined}
                              value={item.title}
                              onChange={handleTitleChange(item.id)}
                              onKeyDown={handleKeyDown(item.id)}
                              classNames='flex-1'
                            />
                            <Toolbar.Root classNames='p-0 m-0 !w-auto'>
                              <HuePickerToolbarButton hue={item.color} onChangeHue={handleColorChange(item.id)} />
                            </Toolbar.Root>
                            <IconButton
                              icon='ph--trash--fill'
                              iconOnly
                              label={t('select option delete')}
                              onClick={() => handleDelete(item.id)}
                            />
                          </div>
                        </div>
                      )}
                    </List.Item>
                  </div>
                ))}
                <div role='listitem'>
                  <div
                    role='button'
                    className={mx('p-1 plb-2', 'flex flex-col', 'cursor-pointer', 'hover:bg-hoverOverlay')}
                    onClick={handleAdd}
                  >
                    <div className='flex items-center gap-1'>
                      <Icon icon='ph--plus--regular' />
                      <span className='text-sm'>{t('select option add')}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </List.Root>
        )}
      </div>
    </Input.Root>
  );
};
