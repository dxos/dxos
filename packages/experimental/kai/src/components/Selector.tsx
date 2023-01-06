//
// Copyright 2023 DXOS.org
//

import { CaretDown, CaretUp } from 'phosphor-react';
import React, { FC, useState } from 'react';

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

  // TODO(burdon): Esc to cancel/close.
  // TODO(burdon): Cursor up/down (input tab).
  // TODO(burdon): On change dynamic options.
  // TODO(burdon): Click outside (lose focus) to close.

  return (
    <div className='flex flex-col'>
      <div className={mx('flex flex-1 items-center p-2 border-2', open ? 'rounded-t' : 'rounded')}>
        <Input className='w-full outline-0' onChange={onChange} placeholder='Select...' />
        <div className='flex' style={{ width: 16 }}>
          {hasOptions && <button onClick={handleToggleOpen}>{open ? <CaretDown /> : <CaretUp />}</button>}
        </div>
      </div>
      {hasOptions && open && (
        <div className='relative'>
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
