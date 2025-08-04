//
// Copyright 2023 DXOS.org
//

import React, { useCallback, useRef, useState } from 'react';

import { LayoutAction, createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { type Live } from '@dxos/live-object';
import { log } from '@dxos/log';
import { Button, Input, useTranslation } from '@dxos/react-ui';

import { SPACE_PLUGIN } from '../meta';
import { Obj } from '@dxos/echo';

export const POPOVER_RENAME_OBJECT = `${SPACE_PLUGIN}/PopoverRenameObject`;

export const PopoverRenameObject = ({ object }: { object: Live<any> }) => {
  const { t } = useTranslation(SPACE_PLUGIN);
  const doneButton = useRef<HTMLButtonElement>(null);
  const [name, setName] = useState(Obj.getLabel(object));
  const { dispatchPromise: dispatch } = useIntentDispatcher();

  const handleDone = useCallback(() => {
    try {
      name && Obj.setLabel(object, name);
    } catch (err) {
      log.error('Failed to rename object', { err });
    }
    void dispatch(
      createIntent(LayoutAction.UpdatePopover, {
        part: 'popover',
        options: { variant: 'react', anchorId: '', state: false },
      }),
    );
  }, [object, name]);

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
