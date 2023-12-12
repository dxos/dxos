//
// Copyright 2023 DXOS.org
//

import { CaretDown } from '@phosphor-icons/react';
import { type RowData } from '@tanstack/react-table';
import React, { useCallback, useState } from 'react';

import { Popover, useTranslation } from '@dxos/react-ui';
import { PopoverCombobox } from '@dxos/react-ui-searchlist';
import { descriptionText, getSize, mx, staticPlaceholderText } from '@dxos/react-ui-theme';

import { type SearchListQueryModel } from '../../helpers';
import { translationKey } from '../../translations';

export type ComboboxCellItems<TData extends RowData> = Record<string, { label: string; data: TData }>;

const initialItems = <TData extends RowData>(model: SearchListQueryModel<TData>, value?: TData) =>
  value
    ? {
        [model.getId(value)]: { label: model.getText(value), data: value },
      }
    : {};

export const CellCombobox = <TData extends RowData>({
  model,
  value,
  onValueChange,
}: {
  model: SearchListQueryModel<TData>;
  value: TData;
  onValueChange: (value: TData) => void;
}) => {
  const { t } = useTranslation(translationKey);
  const [items, setItems] = useState<ComboboxCellItems<TData>>(initialItems(model, value));
  const [loading, setLoading] = useState(false);
  const [searchInputValue, setSearchInputValue] = useState('');
  const handleSearchInputValueChange = async (text?: string) => {
    setSearchInputValue(text ?? '');
    setLoading(true);
    const items = await model.query(text);
    setItems(
      items.reduce((acc: ComboboxCellItems<TData>, item) => {
        acc[model.getId(item)] = {
          label: model.getText(item),
          data: item,
        };
        return acc;
      }, initialItems(model, value)),
    );
    setLoading(false);
  };

  const handleValueChange = useCallback(
    (id: string) => {
      onValueChange(items[id]?.data);
    },
    [items, onValueChange],
  );

  return (
    <PopoverCombobox.Root placeholder={t('no selection label')}>
      <PopoverCombobox.Trigger variant='ghost' classNames='is-full rounded-none ring-inset'>
        {value ? (
          <>
            <span
              className={mx(
                'font-normal text-start text-base flex-1 min-is-0 truncate mie-2',
                !value && staticPlaceholderText,
              )}
            >
              {model.getText(value)}
            </span>
            <CaretDown weight='bold' className={getSize(3)} />
          </>
        ) : null}
      </PopoverCombobox.Trigger>
      <PopoverCombobox.Content shouldFilter={false} classNames='is-[--radix-popover-trigger-width]'>
        <PopoverCombobox.Input value={searchInputValue} onValueChange={handleSearchInputValueChange} />
        <PopoverCombobox.List>
          {searchInputValue.length < 1 ? (
            <p className={mx('text-center', descriptionText)}>Start typing to search</p>
          ) : loading ? (
            <p className={mx('text-center', descriptionText)}>Searching…</p>
          ) : (
            <>
              <PopoverCombobox.Empty classNames={['text-center', descriptionText]}>No results</PopoverCombobox.Empty>
              {Object.entries(items).map(([id, { label }]) => (
                <PopoverCombobox.Item key={id} value={id} onSelect={handleValueChange} classNames='truncate'>
                  {label}
                </PopoverCombobox.Item>
              ))}
            </>
          )}
        </PopoverCombobox.List>
        <Popover.Arrow />
      </PopoverCombobox.Content>
    </PopoverCombobox.Root>
  );
};
