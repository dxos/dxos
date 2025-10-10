//
// Copyright 2023 DXOS.org
//

import React, { useCallback, useRef, useState } from 'react';

import { LayoutAction, createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { Button, Input, Popover, useTranslation } from '@dxos/react-ui';

import { meta } from '../meta';
import { type Mailbox } from '../types';

export const POPOVER_SAVE_FILTER = `${meta.id}/PopoverSaveFilter`;

export const PopoverSaveFilter = ({ mailbox, filter }: { mailbox: Mailbox.Mailbox; filter: string }) => {
  const { t } = useTranslation(meta.id);
  const doneButton = useRef<HTMLButtonElement>(null);
  const [name, setName] = useState('');
  const { dispatchPromise: dispatch } = useIntentDispatcher();

  const handleDone = useCallback(() => {
    mailbox.filters.push({ name, filter });
    void dispatch(
      createIntent(LayoutAction.UpdatePopover, {
        part: 'popover',
        options: { variant: 'virtual', anchor: null, state: false },
      }),
    );
  }, [mailbox, name]);

  // TODO(thure): Why does the input value need to be uncontrolled to work?
  return (
    <div role='none' className='p-2 flex gap-2'>
      <div role='none' className='flex-1'>
        <Input.Root>
          <Input.Label srOnly>{t('saved filter name label')}</Input.Label>
          <Input.TextInput
            defaultValue={name}
            placeholder={t('save filter placeholder')}
            onChange={({ target: { value } }) => setName(value)}
            // TODO(wittjosiah): Ideally this should access the popover context to close the popover.
            //   Currently this is not possible because Radix does not expose the popover context.
            onKeyDown={({ key }) => key === 'Enter' && doneButton.current?.click()}
          />
        </Input.Root>
      </div>
      <Popover.Close asChild>
        <Button ref={doneButton} classNames='self-stretch' disabled={!name} onClick={handleDone}>
          {t('save filter button')}
        </Button>
      </Popover.Close>
    </div>
  );
};
