import React, { KeyboardEvent } from 'react';
import { mx, getSize, defaultFocus, Button, defaultHover } from '@dxos/react-uikit';
import { Input } from './Input';
import { X } from 'phosphor-react';

export type CheckBoxItemProps = {
  isLoading?: boolean;
  text?: string;
  placeholder?: string;
  isChecked?: boolean;
  onTextChanged?: (value: string) => any;
  onChecked?: (value: boolean) => any;
  onDeleteClicked?: () => any;
  onInputKeyUp?: (e: KeyboardEvent<HTMLInputElement>) => any;
};

export const CheckboxItem = (props: CheckBoxItemProps) => {
  const { text, isChecked, placeholder, onTextChanged, onChecked, onDeleteClicked, onInputKeyUp } = props;
  return (
    <li className='flex items-center gap-2 mbe-2 pl-3'>
      <input
        type='checkbox'
        checked={!!isChecked}
        className={mx(
          'text-primary-600 bg-neutral-50 rounded-full border-neutral-300 dark:bg-neutral-800 dark:border-neutral-600 cursor-pointer',
          defaultFocus,
          defaultHover({})
        )}
        onChange={(e) => {
          const val = e?.target?.checked;
          val != isChecked && onChecked?.(val);
        }}
      />
      <div role='none' className='grow'>
        <Input
          type='text'
          placeholder={placeholder}
          defaultValue={text ?? ''}
          onChange={(e) => onTextChanged?.(e.target.value)}
          onKeyUp={onInputKeyUp}
        />
      </div>
      <div role='none' className='actions'>
        <Button className='rounded-full p-2 border-none' onClick={onDeleteClicked}>
          <X className={getSize(4)} />
        </Button>
      </div>
    </li>
  );
};
