//
// Copyright 2023 DXOS.org
//

import React, { useCallback, useRef, useState } from 'react';

import { FolderType } from '@braneframe/types';
import { type ExpandoType } from '@dxos/echo-schema';
import { Button, Input, Popover, useTranslation } from '@dxos/react-ui';

import { SPACE_PLUGIN } from '../meta';

export const PopoverRenameObject = ({ object: obj }: { object: ExpandoType }) => {
  const { t } = useTranslation(SPACE_PLUGIN);
  const doneButton = useRef<HTMLButtonElement>(null);
  // TODO(wittjosiah): Use schema here.
  const object = obj as any;
  // TODO(burdon): Field should not be hardcoded field.
  const [name, setName] = useState(object.title || object.name || '');

  const handleDone = useCallback(() => {
    if (object instanceof FolderType) {
      object.name = name;
    } else {
      object.title = name;
    }
  }, [object, name]);

  return (
    <div role='none' className='p-1 flex gap-2'>
      <div role='none' className='flex-1'>
        <Input.Root>
          <Input.Label srOnly>{t('object name label')}</Input.Label>
          <Input.TextInput
            placeholder={t('object title placeholder')}
            value={name}
            data-testid='spacePlugin.renameObject.input'
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
