//
// Copyright 2023 DXOS.org
//

import { CaretDown, CaretUp } from 'phosphor-react';
import React, { FC, KeyboardEvent, useState } from 'react';

import { mx } from '../../util';
import { Input } from '../Input';

export type SelectorOption = { id: string; title: string };

/**
 * Options selector.
 */
export const Selector: FC<{
  value?: string;
  options?: SelectorOption[];
  rows?: number;
  placeholder?: string;
  onSelect?: (id?: string) => void;
  onChange?: (text: string) => void;
}> = ({ value, options, rows = 5, placeholder, onSelect }) => {
  const getText = (id?: string) => {
    if (id === undefined) {
      return '';
    }

    const option = options?.find((option) => option.id === id);
    return option?.title;
  };

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | undefined>(value);
  const [text, setText] = useState(getText(value));
  const hasOptions = !!(options?.length ?? 0);

  const handleToggleOpen = () => {
    setOpen((open) => !open);
  };

  const handleSelect = (id?: string) => {
    setText(getText(id));
    setSelected(id);
    setOpen(false);
    onSelect?.(id);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    const idx = options?.findIndex((option) => option.id === selected) ?? -1;
    switch (event.key) {
      case 'ArrowUp': {
        if (options?.length) {
          const option = options[Math.max(0, idx - 1)];
          setSelected(option.id);
          setOpen(true);
        }
        break;
      }

      case 'ArrowDown': {
        if (options?.length) {
          const option = options[Math.min(options.length - 1, idx + 1)];
          setSelected(option.id);
          setOpen(true);
        }
        break;
      }

      case 'Enter': {
        handleSelect(selected);
        break;
      }
    }
  };

  // TODO(burdon): Esc to cancel/close (ref).
  // TODO(burdon): Refocus on button click.
  // TODO(burdon): On change dynamic options.

  return (
    <div className='flex flex-1 flex-col bg-white'>
      <div className={mx('flex flex-1 items-center p-2 border', open ? 'rounded-t' : 'rounded')}>
        <Input
          label={undefined}
          value={value ? getText(value) : text}
          onChange={(event) => setText(event.target.value)}
          placeholder={placeholder ?? 'Select...'}
          slots={{
            root: {
              className: 'flex flex-1 mlb-0'
            },
            input: {
              className: 'flex flex-1',
              onKeyDown: handleKeyDown,
              onBlur: () => setOpen(false)
            }
          }}
        />

        <div className='flex' style={{ width: 24 }}>
          {hasOptions && (
            <button className='p-1' onClick={handleToggleOpen}>
              {open ? <CaretDown /> : <CaretUp />}
            </button>
          )}
        </div>
      </div>

      {hasOptions && open && (
        <div className='relative z-50'>
          <div className='absolute flex flex-col overflow-y-auto w-full bg-gray-100' style={{ maxHeight: rows * 32 }}>
            {options!.map((option) => (
              <div
                key={option.id}
                className={mx('p-1 pl-2 pr-2 cursor-pointer', selected === option.id && 'bg-gray-300')}
                onClick={() => handleSelect(option.id)}
              >
                {option.title}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
