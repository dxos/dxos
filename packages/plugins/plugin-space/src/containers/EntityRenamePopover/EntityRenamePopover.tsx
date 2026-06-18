//
// Copyright 2023 DXOS.org
//

import React, { useCallback, useRef, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation } from '@dxos/app-toolkit';
import { Entity } from '@dxos/echo';
import { log } from '@dxos/log';
import { Button, Input, useTranslation } from '@dxos/react-ui';
import { osTranslations } from '@dxos/ui-theme';

import { meta } from '#meta';

export const ENTITY_RENAME_POPOVER = `${meta.profile.key}.EntityRenamePopover`;

export const EntityRenamePopover = ({ entity }: { entity: Entity.Unknown }) => {
  const { t } = useTranslation(meta.profile.key);
  const doneButton = useRef<HTMLButtonElement>(null);
  const [name, setName] = useState(Entity.getLabel(entity));
  const { invokePromise } = useOperationInvoker();

  const handleDone = useCallback(() => {
    try {
      name && Entity.update(entity, () => Entity.setLabel(entity, name));
    } catch (err) {
      log.error('Failed to rename entity', { err });
    }
    void invokePromise(LayoutOperation.UpdatePopover, { anchorId: '', state: false });
  }, [entity, name, invokePromise]);

  return (
    <div className='p-2 flex gap-2'>
      <div className='flex-1'>
        <Input.Root>
          <Input.Label srOnly>{t('object-name.label')}</Input.Label>
          <Input.TextInput
            placeholder={t('object.placeholder')}
            value={name}
            data-testid='spacePlugin.renameObject.input'
            onChange={({ target: { value } }) => setName(value)}
            onKeyDown={({ key }) => key === 'Enter' && doneButton.current?.click()}
          />
        </Input.Root>
      </div>
      <Button ref={doneButton} classNames='self-stretch' onClick={handleDone}>
        {t('done.label', { ns: osTranslations })}
      </Button>
    </div>
  );
};
