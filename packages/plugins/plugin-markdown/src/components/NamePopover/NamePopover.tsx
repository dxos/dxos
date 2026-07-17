//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren, useState } from 'react';

import { Button, Input, Popover, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';

export type NamePopoverProps = PropsWithChildren<{
  open: boolean;
  placeholder: string;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}>;

/**
 * Name-entry popover anchored to its trigger (mirrors the object rename popover UX).
 * Enter or Create commits — an empty name is allowed; Escape or dismissal cancels.
 */
export const NamePopover = ({ children, open, placeholder, onSubmit, onCancel }: NamePopoverProps) => {
  const [value, setValue] = useState('');
  const { t } = useTranslation(meta.profile.key);

  const submit = () => {
    onSubmit(value);
    setValue('');
  };

  const cancel = () => {
    onCancel();
    setValue('');
  };

  return (
    <Popover.Root open={open} onOpenChange={(next) => !next && cancel()}>
      <Popover.Trigger asChild>{children}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content>
          <div role='none' className='flex items-center gap-1 p-2'>
            <Input.Root>
              <Input.Label srOnly>{placeholder}</Input.Label>
              <Input.TextInput
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
            </Input.Root>
            <Button variant='primary' onClick={submit}>
              {t('create.label')}
            </Button>
          </div>
          <Popover.Arrow />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

NamePopover.displayName = 'NamePopover';
