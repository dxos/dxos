//
// Copyright 2023 DXOS.org
//

import { CaretDown, CaretUp } from 'phosphor-react';
import React, { FC, KeyboardEvent, useState } from 'react';

import { mx } from '@dxos/react-ui';

import { Input } from './Input';

export type SelectorOption = { id: string; title: string };

/**
 * Options selector.
 */
export const Selector: FC<{
  options?: SelectorOption[];
  onSelect?: (id: string) => void;
  onChange?: (text: string) => void;
}> = ({ options, onSelect, onChange }) => {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string>();
  const hasOptions = !!(options?.length ?? 0);

  const handleToggleOpen = () => {
    setOpen((open) => !open);
  };

  const handleSelect = (id: string) => {
    setSelected(id);
    onSelect?.(id);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    const idx = options?.findIndex((option) => option.id === selected) ?? -1;
    switch (event.key) {
      case 'ArrowUp': {
        if (options?.length) {
          const option = options[Math.max(0, idx - 1)];
          handleSelect(option.id);
          setOpen(true);
        }
        break;
      }

      case 'ArrowDown': {
        if (options?.length) {
          const option = options[Math.min(options.length - 1, idx + 1)];
          handleSelect(option.id);
          setOpen(true);
        }
        break;
      }
    }
  };

  // TODO(burdon): Esc to cancel/close (ref).
  // TODO(burdon): Refocus on button click.
  // TODO(burdon): On change dynamic options.

  return (
    <div className='flex flex-1 flex-col'>
      <div className={mx('flex flex-1 items-center p-2 border-2', open ? 'rounded-t' : 'rounded')}>
        <Input
          className='w-full outline-0'
          onKeyDown={handleKeyDown}
          onChange={onChange}
          onBlur={() => setOpen(false)}
          placeholder='Select...'
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
          <div className='absolute flex flex-col w-full bg-gray-100'>
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
