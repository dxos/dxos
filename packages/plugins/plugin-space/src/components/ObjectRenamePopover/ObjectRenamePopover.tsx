//
// Copyright 2023 DXOS.org
//

import React, { useCallback, useRef, useState } from 'react';

import { Common } from '@dxos/app-framework';
import { useOperationInvoker } from '@dxos/app-framework/react';
import { Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { Button, Input, useTranslation } from '@dxos/react-ui';

import { meta } from '../../meta';

export const OBJECT_RENAME_POPOVER = `${meta.id}/ObjectRenamePopover`;

export const ObjectRenamePopover = ({ object }: { object: Obj.Any }) => {
  const { t } = useTranslation(meta.id);
  const doneButton = useRef<HTMLButtonElement>(null);
  const [name, setName] = useState(Obj.getLabel(object));
  const { invokePromise } = useOperationInvoker();

  const handleDone = useCallback(() => {
    try {
      name && Obj.setLabel(object, name);
    } catch (err) {
      log.error('Failed to rename object', { err });
    }
    void invokePromise(Common.LayoutOperation.UpdatePopover, { anchorId: '', state: false });
  }, [object, name, invokePromise]);

  return (
    <div role='none' className='p-2 flex gap-2'>
      <div role='none' className='flex-1'>
        <Input.Root>
          <Input.Label srOnly>{t('object name label')}</Input.Label>
          <Input.TextInput
            placeholder={t('object placeholder')}
            value={name}
            data-testid='spacePlugin.renameObject.input'
            onChange={({ target: { value } }) => setName(value)}
            onKeyDown={({ key }) => key === 'Enter' && doneButton.current?.click()}
          />
        </Input.Root>
      </div>
      <Button ref={doneButton} classNames='self-stretch' onClick={handleDone}>
        {t('done label', { ns: 'os' })}
      </Button>
    </div>
  );
};
