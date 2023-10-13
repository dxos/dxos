//
// Copyright 2023 DXOS.org
//

import React, { useCallback, useRef, useState } from 'react';

import { Button, Input, Popover, useTranslation } from '@dxos/aurora';
import { type Space } from '@dxos/react-client/echo';

import { SPACE_PLUGIN } from '../types';

export const PopoverRenameSpace = ({ data: [_, space] }: { data: [string, Space] }) => {
  const { t } = useTranslation(SPACE_PLUGIN);
  const doneButton = useRef<HTMLButtonElement>(null);
  const [name, setName] = useState(space.properties.name ?? '');

  const handleDone = useCallback(() => {
    space.properties.name = name;
  }, [space, name]);

  // todo(thure): Why does the input value need to be uncontrolled to work?
  return (
    <div role='none' className='p-1 flex gap-2'>
      <div role='none' className='flex-1'>
        <Input.Root>
          <Input.Label srOnly>{t('space name label')}</Input.Label>
          <Input.TextInput
            defaultValue={space.properties.name ?? ''}
            placeholder={t('untitled space title')}
            onChange={({ target: { value } }) => setName(value)}
            // TODO(wittjosiah): Ideally this should access the popover context to close the popover.
            //   Currently this is not possible because Radix does not expose the popover context.
            onKeyDown={({ key }) => key === 'Enter' && doneButton.current?.click()}
          />
        </Input.Root>
      </div>
      <Popover.Close asChild>
        <Button ref={doneButton} classNames='self-stretch' onClick={handleDone}>
          {t('done label', { ns: 'os' })}
        </Button>
      </Popover.Close>
    </div>
  );
};
