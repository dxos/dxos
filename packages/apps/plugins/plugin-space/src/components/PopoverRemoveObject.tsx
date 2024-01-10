//
// Copyright 2023 DXOS.org
//

import React, { useCallback, useRef } from 'react';

import { type TypedObject } from '@dxos/react-client/echo';
import { Button, Input, Popover, useTranslation } from '@dxos/react-ui';

import { SPACE_PLUGIN } from '../meta';

export const PopoverRemoveObject = ({ object }: { object: TypedObject }) => {
  const { t } = useTranslation(SPACE_PLUGIN);
  const deleteButton = useRef<HTMLButtonElement>(null);

  const handleDelete = useCallback(() => {
    console.log('delete');
  }, [object]);

  return (
    <div role='none' className='p-1'>
      <div role='none'>
        <Input.Root>
          <Input.DescriptionAndValidation>Delete this item?</Input.DescriptionAndValidation>
        </Input.Root>
      </div>
      <Popover.Close asChild>
        <Button ref={deleteButton} classNames='self-stretch' onClick={handleDelete}>
          {t('delete label', { ns: 'os' })}
        </Button>
      </Popover.Close>
    </div>
  );
};
