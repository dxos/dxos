//
// Copyright 2023 DXOS.org
//

import React, { useCallback, useRef, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { Obj } from '@dxos/echo';
import * as Button from '@dxos/react-ui/Button';
import * as Field from '@dxos/react-ui/Field';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Input from '@dxos/react-ui/Input';
import * as Layout from '@dxos/react-ui/Layout';
import * as Popover from '@dxos/react-ui/Popover';

import { meta } from '#meta';
import { Mailbox } from '#types';

export const SaveFilterPopover = ({ mailbox, filter }: { mailbox: Mailbox.Mailbox; filter: string }) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const doneButton = useRef<HTMLButtonElement>(null);
  const [name, setName] = useState('');
  const { invokePromise } = Hooks.useOperationInvoker();

  const handleDone = useCallback(() => {
    Obj.update(mailbox, (mailbox) => {
      (mailbox.filters ??= []).push({ name, filter });
    });
    void invokePromise(LayoutOperation.UpdatePopover, { state: false, anchorId: '' });
  }, [mailbox, name, filter, invokePromise]);

  return (
    <Layout.Flex gap='sm' classNames='p-2'>
      <div className='flex-1'>
        <Field.Root>
          <Field.Label srOnly>{t('saved-filter-name.label')}</Field.Label>
          <Input.Root
            defaultValue={name}
            placeholder={t('save-filter.placeholder')}
            onChange={({ target: { value } }) => setName(value)}
            // TODO(wittjosiah): Ideally this should access the popover context to close the popover.
            //   Currently this is not possible because Radix does not expose the popover context.
            onKeyDown={({ key }) => key === 'Enter' && doneButton.current?.click()}
          />
        </Field.Root>
      </div>
      <Popover.CloseTrigger asChild>
        <Button.Root ref={doneButton} classNames='self-stretch' disabled={!name} onClick={handleDone}>
          {t('save-filter.button')}
        </Button.Root>
      </Popover.CloseTrigger>
    </Layout.Flex>
  );
};

SaveFilterPopover.displayName = 'SaveFilterPopover';
