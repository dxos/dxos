//
// Copyright 2023 DXOS.org
//

import React, { useCallback, useRef, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { Obj } from '@dxos/echo';
import { Flex, useTranslation } from '@dxos/react-ui';
import { Next } from '@dxos/react-ui/next';

import { meta } from '#meta';
import { Mailbox } from '#types';

export const SaveFilterPopover = ({ mailbox, filter }: { mailbox: Mailbox.Mailbox; filter: string }) => {
  const { t } = useTranslation(meta.profile.key);
  const doneButton = useRef<HTMLButtonElement>(null);
  const [name, setName] = useState('');
  const { invokePromise } = useOperationInvoker();

  const handleDone = useCallback(() => {
    Obj.update(mailbox, (mailbox) => {
      (mailbox.filters ??= []).push({ name, filter });
    });
    void invokePromise(LayoutOperation.UpdatePopover, { state: false, anchorId: '' });
  }, [mailbox, name, filter, invokePromise]);

  return (
    <Flex gap='sm' classNames='p-2'>
      <div className='flex-1'>
        <Next.Field.Root>
          <Next.Field.Label srOnly>{t('saved-filter-name.label')}</Next.Field.Label>
          <Next.Input
            defaultValue={name}
            placeholder={t('save-filter.placeholder')}
            onChange={({ target: { value } }) => setName(value)}
            // TODO(wittjosiah): Ideally this should access the popover context to close the popover.
            //   Currently this is not possible because Radix does not expose the popover context.
            onKeyDown={({ key }) => key === 'Enter' && doneButton.current?.click()}
          />
        </Next.Field.Root>
      </div>
      <Next.Popover.CloseTrigger asChild>
        <Next.Button ref={doneButton} classNames='self-stretch' disabled={!name} onClick={handleDone}>
          {t('save-filter.button')}
        </Next.Button>
      </Next.Popover.CloseTrigger>
    </Flex>
  );
};

SaveFilterPopover.displayName = 'SaveFilterPopover';
