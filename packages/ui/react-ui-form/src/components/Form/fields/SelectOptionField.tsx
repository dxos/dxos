//
// Copyright 2025 DXOS.org
//

import React, { type ChangeEvent, type KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react';

import { type SelectOption } from '@dxos/echo/internal';
import { PublicKey } from '@dxos/keys';
import { type ChromaticPalette, IconButton, Input, Tag, useTranslation } from '@dxos/react-ui';
import { List } from '@dxos/react-ui-list';
import { HuePicker } from '@dxos/react-ui-pickers';
import { hues, subtleHover } from '@dxos/react-ui-theme';

import { translationKey } from '../../../translations';
import { type FormFieldComponentProps, FormFieldLabel } from '../FormFieldComponent';

export const SelectOptionField = ({
  type,
  readonly,
  label,
  getStatus,
  getValue,
  onValueChange,
}: FormFieldComponentProps<SelectOption[] | undefined>) => {
  const { t } = useTranslation(translationKey);
  const { status, error } = getStatus();
  const [selected, setSelectedId] = useState<string | null>(null);
  const [isNewOption, setIsNewOption] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const options = getValue();

  // Initialization.
  useEffect(() => {
    if (options === undefined) {
      onValueChange(type, []);
    }
  }, [options, onValueChange, type]);

  const randomHue = () => {
    const usedHues = new Set(options?.map((option) => option.color) ?? []);
    // Pick a random unused option from hueTokenThemes.
    const unusedHues = hues.filter((hue) => !usedHues.has(hue));
    if (unusedHues.length > 0) {
      return unusedHues[Math.floor(Math.random() * unusedHues.length)];
    }

    // Pick a random one that hasn't been used in the last three options
    const lastThree = new Set(options?.slice(-3).map((option) => option.color) ?? []);
    const availableHues = hues.filter((hue) => !lastThree.has(hue));
    return (
      availableHues[Math.floor(Math.random() * availableHues.length)] ?? hues[Math.floor(Math.random() * hues.length)]
    );
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

  const handleKeyDown = useCallback((ev: KeyboardEvent<HTMLInputElement>) => {
    if (ev.key === 'Enter') {
      setSelectedId(null);
    }
  }, []);

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
      <FormFieldLabel error={error} readonly={readonly} label={label} />
      <div role='none'>
        {options && (
          <List.Root
            items={options}
            isItem={(_item) => true}
            onMove={readonly ? undefined : handleMove}
            readonly={!!readonly}
          >
            {({ items }) => (
              <div role='list' className='is-full overflow-auto'>
                {items?.map((item) => (
                  <div key={item.id}>
                    <List.Item
                      role='button'
                      item={item}
                      classNames={[subtleHover, 'flex flex-col cursor-pointer rounded-sm']}
                      aria-expanded={selected === item.id}
                    >
                      <div className='flex items-center'>
                        <List.ItemDragHandle disabled={!!readonly} />
                        <List.ItemTitle onClick={() => handleClick(item.id)} classNames='flex-1'>
                          {/* TODO(ZaymonFC): Move spacer into Tag component. */}
                          <Tag palette={item.color as ChromaticPalette}>{item.title || '\u200b'}</Tag>
                        </List.ItemTitle>
                        <IconButton
                          iconOnly
                          variant='ghost'
                          label={t(selected === item.id ? 'collapse label' : 'expand label', { ns: 'os' })}
                          icon={selected === item.id ? 'ph--caret-down--regular' : 'ph--caret-right--regular'}
                          onClick={() => handleClick(item.id)}
                        />
                      </div>
                      {selected === item.id && (
                        <div className='pli-cardSpacingInline plb-cardSpacingBlock flex flex-col gap-1 density-fine'>
                          {/* 16px to match drag handle width. */}
                          <Input.Label classNames='text-xs'>{t('select option label')}</Input.Label>
                          <div className='grid grid-cols-[1fr_min-content_min-content] gap-1'>
                            <Input.TextInput
                              disabled={!!readonly}
                              placeholder={t('select option label placeholder')}
                              ref={selected === item.id ? inputRef : undefined}
                              value={item.title}
                              onChange={handleTitleChange(item.id)}
                              onKeyDown={handleKeyDown}
                              classNames='flex-1'
                            />
                            <HuePicker disabled={!!readonly} value={item.color} onChange={handleColorChange(item.id)} />
                            <IconButton
                              disabled={!!readonly}
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
                <IconButton
                  variant='ghost'
                  icon='ph--plus--regular'
                  label={t('select option add')}
                  onClick={handleAdd}
                  disabled={!!readonly}
                  classNames='is-full'
                />
              </div>
            )}
          </List.Root>
        )}
      </div>
    </Input.Root>
  );
};
