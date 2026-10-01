//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren, useState } from 'react';

import { Next } from '@dxos/react-ui/next';

export type NamePopoverProps = PropsWithChildren<{
  open: boolean;
  placeholder: string;
  /** Translated label for the submit button (e.g. "Create"). */
  submitLabel: string;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}>;

/**
 * Name-entry popover anchored to its trigger (mirrors the object rename popover UX).
 * Enter or the submit button commits — an empty name is allowed; Escape or dismissal cancels.
 */
export const NamePopover = ({ children, open, placeholder, submitLabel, onSubmit, onCancel }: NamePopoverProps) => {
  const [value, setValue] = useState('');

  const submit = () => {
    onSubmit(value);
    setValue('');
  };

  const cancel = () => {
    onCancel();
    setValue('');
  };

  return (
    <Next.Popover.Root open={open} onOpenChange={({ open: next }) => !next && cancel()}>
      <Next.Popover.Trigger asChild>{children}</Next.Popover.Trigger>
      <Next.Popover.Content>
        <div className='flex items-center gap-1 p-2'>
          <Next.Field.Root>
            <Next.Field.Label srOnly>{placeholder}</Next.Field.Label>
            <Next.Input
              autoFocus
              placeholder={placeholder}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  submit();
                } else if (event.key === 'Escape') {
                  event.preventDefault();
                  event.stopPropagation();
                  cancel();
                }
              }}
            />
          </Next.Field.Root>
          <Next.Button variant='primary' onClick={submit}>
            {submitLabel}
          </Next.Button>
        </div>
      </Next.Popover.Content>
    </Next.Popover.Root>
  );
};

NamePopover.displayName = 'NamePopover';
