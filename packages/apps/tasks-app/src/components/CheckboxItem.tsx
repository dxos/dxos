//
// Copyright 2022 DXOS.org
//

import { X } from '@phosphor-icons/react';
import React, { KeyboardEvent, forwardRef } from 'react';

import { Button } from '@dxos/aurora';
import { mx, getSize, focusRing, hoverColors } from '@dxos/aurora-theme';

import { Input } from './Input';

type Ref = HTMLInputElement;

export type CheckBoxItemProps = {
  isLoading?: boolean;
  text?: string;
  placeholder?: string;
  isChecked?: boolean;
  autoFocus?: boolean;
  onTextChanged?: (value: string) => any;
  onChecked?: (value: boolean) => any;
  onDeleteClicked?: () => any;
  onInputKeyUp?: (e: KeyboardEvent<HTMLInputElement>) => any;
  onInputKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => any;
};

export const CheckboxItem = forwardRef<Ref, CheckBoxItemProps>((props, ref) => {
  const {
    text,
    isChecked,
    autoFocus,
    placeholder,
    onTextChanged,
    onChecked,
    onDeleteClicked,
    onInputKeyUp,
    onInputKeyDown,
  } = props;
  return (
    <li className='flex items-center gap-2 mbe-2 pl-3'>
      <input
        type='checkbox'
        checked={!!isChecked}
        className={mx(
          'text-primary-600 bg-neutral-50 rounded-full border-neutral-300 dark:bg-neutral-800 dark:border-neutral-600 cursor-pointer',
          focusRing,
          hoverColors,
        )}
        onChange={(e) => {
          const val = e?.target?.checked;
          val !== isChecked && onChecked?.(val);
        }}
      />
      <div role='none' className='grow'>
        <Input
          ref={ref}
          type='text'
          autoFocus={autoFocus}
          placeholder={placeholder}
          value={text ?? ''}
          onChange={(e) => onTextChanged?.(e.target.value)}
          onKeyUp={onInputKeyUp}
          onKeyDown={onInputKeyDown}
        />
      </div>
      <div role='none' className='actions'>
        <Button classNames='rounded-full p-2 border-none' onClick={onDeleteClicked}>
          <X className={getSize(4)} />
        </Button>
      </div>
    </li>
  );
});
