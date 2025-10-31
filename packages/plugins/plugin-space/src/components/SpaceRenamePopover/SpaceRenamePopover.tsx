//
// Copyright 2023 DXOS.org
//

import React, { useCallback, useRef, useState } from 'react';

import { LayoutAction, createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { type Space } from '@dxos/client/echo';
import { Button, Input, Popover, useTranslation } from '@dxos/react-ui';

import { meta } from '../../meta';

export const SPACE_RENAME_POPOVER = `${meta.id}/SpaceRenamePopover`;

export const SpaceRenamePopover = ({ space }: { space: Space }) => {
  const { t } = useTranslation(meta.id);
  const doneButton = useRef<HTMLButtonElement>(null);
  const [name, setName] = useState(space.properties.name ?? '');
  const { dispatchPromise: dispatch } = useIntentDispatcher();

  const handleDone = useCallback(() => {
    space.properties.name = name;
    void dispatch(
      createIntent(LayoutAction.UpdatePopover, {
        part: 'popover',
        options: { variant: 'react', anchorId: '', state: false },
      }),
    );
  }, [space, name]);

  // TODO(thure): Why does the input value need to be uncontrolled to work?
  return (
    <div role='none' className='p-2 flex gap-2'>
      <div role='none' className='flex-1'>
        <Input.Root>
          <Input.Label srOnly>{t('space name label')}</Input.Label>
          <Input.TextInput
            defaultValue={space.properties.name ?? ''}
            placeholder={t('unnamed space label')}
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
