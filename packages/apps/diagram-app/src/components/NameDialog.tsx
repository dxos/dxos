//
// Copyright 2026 DXOS.org
//

import React, { type FormEvent, useState } from 'react';

import * as Button from '@dxos/react-ui/Button';
import * as Dialog from '@dxos/react-ui/Dialog';
import * as Input from '@dxos/react-ui/Input';

export type NameDialogProps = {
  title: string;
  label: string;
  submitLabel: string;
  initialValue?: string;
  placeholder?: string;
  onSubmit: (value: string) => void;
  onClose: () => void;
};

/** One text field and a submit button: naming a space, renaming a diagram, or pasting an invitation link. */
export const NameDialog = ({
  title,
  label,
  submitLabel,
  initialValue = '',
  placeholder,
  onSubmit,
  onClose,
}: NameDialogProps) => {
  const [value, setValue] = useState(initialValue);
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (value.trim()) {
      onSubmit(value.trim());
    }
  };

  return (
    <Dialog.Root open onOpenChange={({ open }) => !open && onClose()}>
      <Dialog.Content size='sm' data-testid='diagram-app.name-dialog'>
        <form onSubmit={handleSubmit} className='contents'>
          <Dialog.Header>
            <Dialog.Title>{title}</Dialog.Title>
            <Dialog.CloseTrigger />
          </Dialog.Header>
          <Dialog.Body>
            <Input.Root
              autoFocus
              aria-label={label}
              placeholder={placeholder}
              value={value}
              data-testid='diagram-app.name-dialog.input'
              onChange={(event) => setValue(event.target.value)}
            />
          </Dialog.Body>
          <Dialog.Footer>
            <Dialog.CloseTrigger asChild>
              <Button.Root variant='ghost'>Cancel</Button.Root>
            </Dialog.CloseTrigger>
            <Button.Root
              type='submit'
              variant='primary'
              disabled={!value.trim()}
              data-testid='diagram-app.name-dialog.submit'
            >
              {submitLabel}
            </Button.Root>
          </Dialog.Footer>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
};
