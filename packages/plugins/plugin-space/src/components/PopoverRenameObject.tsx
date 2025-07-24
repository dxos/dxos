//
// Copyright 2023 DXOS.org
//

import React, { useCallback, useRef, useState } from 'react';

import { createIntent, LayoutAction, useIntentDispatcher } from '@dxos/app-framework';
import { type Live } from '@dxos/live-object';
import { log } from '@dxos/log';
import { Button, Input, useTranslation } from '@dxos/react-ui';

import { SPACE_PLUGIN } from '../meta';

export const POPOVER_RENAME_OBJECT = `${SPACE_PLUGIN}/PopoverRenameObject`;

export const PopoverRenameObject = ({ object: obj }: { object: Live<any> }) => {
  const { t } = useTranslation(SPACE_PLUGIN);
  const doneButton = useRef<HTMLButtonElement>(null);
  // TODO(wittjosiah): Use schema here.
  const object = obj as any;
  // TODO(burdon): Field should not be hardcoded field.
  const [name, setName] = useState(object.name || object.title || '');
  const { dispatchPromise: dispatch } = useIntentDispatcher();

  const handleDone = useCallback(() => {
    try {
      object.name = name;
    } catch (err) {
      try {
        object.title = name;
      } catch {
        log.error('Failed to rename object', { err });
      }
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
