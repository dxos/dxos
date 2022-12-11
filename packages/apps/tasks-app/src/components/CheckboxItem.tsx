import React from 'react';
import { mx, getSize, defaultFocus, defaultHover, Input } from '@dxos/react-uikit';

export type CheckBoxItemProps = {
  isLoading?: boolean;
  text?: string;
  placeholder?: string;
  isChecked?: boolean;
  onTextChanged?: (value: string) => any;
  onChecked?: (value: boolean) => any;
};

export const CheckboxItem = (props: CheckBoxItemProps) => {
  const { isLoading, text, isChecked, placeholder, onTextChanged, onChecked } = props;
  return (
    <li className='flex items-center gap-2 pli-4 mbe-2'>
      <input
        type='checkbox'
        checked={isChecked}
        className={mx(
          getSize(5),
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
        <Input label={''} placeholder={placeholder} initialValue={text} onChange={onTextChanged} labelVisuallyHidden />
      </div>
    </li>
  );
};
