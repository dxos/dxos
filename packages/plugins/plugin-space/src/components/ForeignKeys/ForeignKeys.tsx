//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { type Key } from '@dxos/echo';
import { IconButton, useTranslation } from '@dxos/react-ui';
import { Listbox } from '@dxos/react-ui-list';

import { meta } from '#meta';

export type ForeignKeysProps = {
  keys: Key.ForeignKey[];
  onDelete?: (key: Key.ForeignKey) => void;
};

// TODO(wittjosiah): This is a clone of `TokenManager`. Consider a form variant for arrays of read-only objects.
export const ForeignKeys = ({ keys, onDelete }: ForeignKeysProps) => {
  return (
    <Listbox.Root>
      <Listbox.Content classNames='gap-2'>
        {keys.map((key) => (
          <KeyItem key={key.id} forignKey={key} onDelete={onDelete} />
        ))}
      </Listbox.Content>
    </Listbox.Root>
  );
};

type KeyItemProps = {
  forignKey: Key.ForeignKey;
  onDelete?: (key: Key.ForeignKey) => void;
};

const KeyItem = ({ forignKey, onDelete }: KeyItemProps) => {
  const { t } = useTranslation(meta.profile.key);

  const handleDelete = useCallback(() => {
    onDelete?.(forignKey);
  }, [forignKey, onDelete]);

  return (
    <Listbox.Item id={forignKey.id} classNames='px-2 gap-2'>
      <div className='flex flex-col grow truncate'>
        <div>{forignKey.source}</div>
        <div className='text-description text-sm truncate'>{forignKey.id}</div>
      </div>
      <IconButton
        iconOnly
        icon='ph--x--regular'
        variant='ghost'
        label={t('delete-key.button')}
        onClick={handleDelete}
      />
    </Listbox.Item>
  );
};
