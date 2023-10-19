//
// Copyright 2023 DXOS.org
//

import React, { useCallback, useRef, useState } from 'react';

import { type TypedObject } from '@dxos/react-client/echo';
import { Button, Input, Popover, useTranslation } from '@dxos/react-ui';

import { SPACE_PLUGIN } from '../types';

export const PopoverRenameObject = ({ data: [_, object] }: { data: [string, TypedObject] }) => {
  const { t } = useTranslation(SPACE_PLUGIN);
  const doneButton = useRef<HTMLButtonElement>(null);
  // TODO(wittjosiah): Normalize title vs name.
  // TODO(burdon): Field should not be hard-code 'title' field.
  const [name, setName] = useState(object.title ?? '');

  const handleDone = useCallback(() => {
    object.title = name;
  }, [object, name]);

  return (
    <div role='none' className='p-1 flex gap-2'>
      <div role='none' className='flex-1'>
        <Input.Root>
          <Input.Label srOnly>{t('object name label')}</Input.Label>
          <Input.TextInput
            placeholder={t('object title placeholder')}
            value={name}
            onChange={({ target: { value } }) => setName(value)}
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
